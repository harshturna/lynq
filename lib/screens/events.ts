import "server-only";
import type { Point } from "@/lib/charts/format";
import type { BuiltContext } from "@/lib/query/authorize";
import type { BreakdownMultiRow } from "@/lib/query/breakdown";
import type { PathRow } from "@/lib/query/paths";
import {
  breakdown,
  breakdownMulti,
  pathsTo,
  rows,
  summary,
  timeseries,
  trends,
} from "@/lib/query/run";
import type { ViewState } from "@/lib/url-state";
import type { Kpi } from "./kpi";
import { type Section, settle } from "./settle";

/**
 * The Events screen (design §8.7): the table with frequency, last seen and
 * a trend; the selected event's trend, property breakdowns, recent
 * occurrences and the paths that end in it.
 */
export const EVENT_LIMIT = 200;
export const TREND_ROWS = 10;
export const PROPERTY_KEYS = 5;
export const PROPERTY_VALUES = 5;
export const RECENT = 20;
export const PATHS = 8;

export type EventsTable = {
  rows: BreakdownMultiRow[];
  previous: Record<string, BreakdownMultiRow> | null;
  total: number;
  /** Sessions in the range, the denominator of "1 in N sessions". */
  sessions: number;
};

export type Occurrence = {
  id: string;
  ts: string;
  path: string;
  props: Record<string, string>;
  country: string;
  device: string;
  visitorId: string;
  sessionId: string;
};

export type SelectedEvent = {
  name: string;
  trend: { current: Point[]; previous: Point[] | null };
  properties: { key: string; values: { value: string; count: number }[] }[];
  recent: Occurrence[];
  paths: PathRow[];
};

export type EventsScreen = {
  compare: boolean;
  kpi: Kpi;
  granularity: BuiltContext["granularity"];
  timezone: string;
  sel: string | undefined;
  table: Promise<Section<EventsTable>>;
  trends: Promise<Section<Record<string, number[]>>>;
  selected: Promise<Section<SelectedEvent | null>>;
};

const toPoints = (s: { bucket: Date; value: number }[]): Point[] =>
  s.map((p) => ({ t: p.bucket.toISOString(), v: p.value }));

export function getEventsScreen(
  ctx: BuiltContext,
  state: ViewState,
  kpi: Kpi
): EventsScreen {
  const prev: BuiltContext | null = ctx.compare
    ? { ...ctx, range: ctx.compare, compare: undefined }
    : null;
  const metrics = [
    "custom_events",
    "visitors",
    "sessions",
    "last_seen",
  ] as const;

  const table = async (): Promise<EventsTable> => {
    const [cur, before, sum] = await Promise.all([
      breakdownMulti(ctx, "event_name", [...metrics], { limit: EVENT_LIMIT }),
      prev
        ? breakdownMulti(prev, "event_name", [...metrics], {
            limit: EVENT_LIMIT,
          })
        : null,
      summary({ ...ctx, compare: undefined }),
    ]);
    return {
      rows: cur.rows,
      previous: before
        ? Object.fromEntries(before.rows.map((r) => [r.value, r]))
        : null,
      total: cur.total,
      sessions: sum.current.sessions,
    };
  };
  const tablePromise = table();

  const trendsFor = async () => {
    const t = await tablePromise;
    const names = t.rows.slice(0, TREND_ROWS).map((r) => r.value);
    if (!names.length) return {};
    const series = await trends(
      ctx,
      "event_name",
      names,
      ctx.granularity,
      "custom_events"
    );
    return Object.fromEntries([...series]);
  };

  const selected = async (): Promise<SelectedEvent | null> => {
    const name = state.sel;
    if (!name) return null;
    const scoped: BuiltContext = {
      ...ctx,
      filters: [
        ...ctx.filters,
        { dimension: "event_name", op: "is", values: [name] },
      ],
    };
    const scopedPrev = prev
      ? { ...scoped, range: prev.range, compare: undefined }
      : null;
    const [cur, before, keys, recent, paths] = await Promise.all([
      timeseries(scoped, "custom_events", ctx.granularity),
      scopedPrev
        ? timeseries(scopedPrev, "custom_events", ctx.granularity)
        : null,
      breakdown(scoped, "prop_key", "custom_events", { limit: PROPERTY_KEYS }),
      rows<{
        id: string;
        ts: Date;
        path: string;
        props: Record<string, string>;
        country: string;
        device: string;
        visitor_id: string;
        session_id: string;
      }>(scoped, "events", { limit: RECENT }),
      pathsTo(ctx, name, PATHS),
    ]);
    const properties = await Promise.all(
      keys.rows.map(async (k) => {
        const values = await breakdown(scoped, "prop_value", "custom_events", {
          propKey: k.value,
          limit: PROPERTY_VALUES,
        });
        return {
          key: k.value,
          values: values.rows.map((v) => ({ value: v.value, count: v.metric })),
        };
      })
    );
    return {
      name,
      trend: {
        current: toPoints(cur),
        previous: before ? toPoints(before) : null,
      },
      properties,
      recent: recent.map((r) => ({
        id: r.id,
        ts: new Date(r.ts).toISOString(),
        path: r.path,
        props: r.props ?? {},
        country: r.country,
        device: r.device,
        visitorId: r.visitor_id,
        sessionId: r.session_id,
      })),
      paths,
    };
  };

  return {
    compare: prev !== null,
    kpi,
    granularity: ctx.granularity,
    timezone: ctx.timezone,
    sel: state.sel,
    table: settle("events.table", tablePromise),
    trends: settle("events.trends", trendsFor()),
    selected: settle("events.selected", selected()),
  };
}
