import "server-only";
import type { Point } from "@/lib/charts/format";
import type { BuiltContext } from "@/lib/query/authorize";
import type { BreakdownMultiRow, MetricSpec } from "@/lib/query/breakdown";
import type { FlowRow } from "@/lib/query/flow";
import type { GoalStats } from "@/lib/query/goals";
import type { Granularity } from "@/lib/query/ranges";
import {
  breakdownMulti,
  goalStats,
  pageFlow,
  summary,
  timeseries,
  vitals,
} from "@/lib/query/run";
import type { VitalsSummary } from "@/lib/query/vitals";
import type { ViewState } from "@/lib/url-state";
import type { Kpi } from "./kpi";
import { type Section, settle } from "./settle";

/**
 * The Pages screen (design §8.3): the attention line and the table share one
 * breakdown; entries and exits join it from the session dimensions; the
 * attention line's split is pageviews (unique visitors do not add up across pages, so
 * an everything-else leaf could not be sized from them); the
 * selected page adds its flow, vitals, goal and trend.
 */
export const PAGE_TABLE_LIMIT = 200;

export type PagesView = "all" | "entry" | "exit";

export type PagesTable = {
  view: PagesView;
  dimension: string;
  rows: BreakdownMultiRow[];
  previous: Record<string, BreakdownMultiRow> | null;
  /** Sessions entering and exiting on each path, for the All view's columns. */
  entries: Record<string, number>;
  exits: Record<string, number>;
  total: number;
  /** Pageviews in the range: the attention line's total, which the split must sum to. */
  pageviews: number;
};

export type SelectedPage = {
  path: string;
  flow: FlowRow[];
  vitals: VitalsSummary;
  goal: GoalStats | null;
  trend: { current: Point[]; previous: Point[] | null };
};

export type PagesScreen = {
  view: PagesView;
  granularity: Granularity;
  timezone: string;
  compare: boolean;
  kpi: Kpi;
  sel: string | undefined;
  table: Promise<Section<PagesTable>>;
  /** Visitors per bucket for the top rows, by path. */
  selected: Promise<Section<SelectedPage | null>>;
};

/**
 * Revenue is added to the entry view only (TICKET-073). It attaches to the
 * pageview whose custom event carried it, so on the all and exit views it
 * piles onto the checkout page and answers "where did the purchase event
 * fire", not "which page led to money". `entry_path` is session-scoped, so
 * the same row metric sums over the whole session and distributes properly.
 * Which mid-funnel page helped is the influence metric in TICKET-080.
 */
function viewsFor(
  kpi: Kpi
): Record<PagesView, { dimension: string; metrics: MetricSpec[] }> {
  const session: MetricSpec[] = [
    "sessions",
    "visitors",
    "bounce_rate",
    "engaged_time",
  ];
  return {
    all: {
      dimension: "path",
      metrics: ["visitors", "pageviews", "bounce_rate", "engaged_time"],
    },
    entry: {
      dimension: "entry_path",
      metrics: kpi.hasRevenue ? [...session, "revenue"] : session,
    },
    exit: { dimension: "exit_path", metrics: session },
  };
}

const toPoints = (s: { bucket: Date; value: number }[]): Point[] =>
  s.map((p) => ({ t: p.bucket.toISOString(), v: p.value }));

export function getPagesScreen(
  ctx: BuiltContext,
  state: ViewState,
  kpi: Kpi
): PagesScreen {
  const prev: BuiltContext | null = ctx.compare
    ? { ...ctx, range: ctx.compare, compare: undefined }
    : null;
  const view: PagesView =
    state.view.pages === "entry" || state.view.pages === "exit"
      ? state.view.pages
      : "all";
  const spec = viewsFor(kpi)[view];

  const table = async (): Promise<PagesTable> => {
    const [cur, before, entries, exits, sum] = await Promise.all([
      breakdownMulti(ctx, spec.dimension, spec.metrics, {
        limit: PAGE_TABLE_LIMIT,
      }),
      prev
        ? breakdownMulti(prev, spec.dimension, spec.metrics, {
            limit: PAGE_TABLE_LIMIT,
          })
        : null,
      view === "all"
        ? breakdownMulti(ctx, "entry_path", ["sessions"], {
            limit: PAGE_TABLE_LIMIT,
          })
        : null,
      view === "all"
        ? breakdownMulti(ctx, "exit_path", ["sessions"], {
            limit: PAGE_TABLE_LIMIT,
          })
        : null,
      summary({ ...ctx, compare: undefined }),
    ]);
    const byValue = (rows: BreakdownMultiRow[], key: string) =>
      Object.fromEntries(rows.map((r) => [r.value, Number(r[key] ?? 0)]));
    return {
      view,
      dimension: spec.dimension,
      rows: cur.rows,
      previous: before
        ? Object.fromEntries(before.rows.map((r) => [r.value, r]))
        : null,
      entries: entries ? byValue(entries.rows, "sessions") : {},
      exits: exits ? byValue(exits.rows, "sessions") : {},
      total: cur.total,
      pageviews: sum.current.pageviews,
    };
  };
  const tablePromise = table();

  const selected = async (): Promise<SelectedPage | null> => {
    const path = state.sel;
    if (!path) return null;
    const scoped: BuiltContext = {
      ...ctx,
      filters: [
        ...ctx.filters,
        { dimension: "path", op: "is", values: [path] },
      ],
    };
    const scopedPrev = prev
      ? { ...scoped, range: prev.range, compare: undefined }
      : null;
    const [flow, v, g, cur, before] = await Promise.all([
      pageFlow(ctx, path),
      vitals(scoped),
      kpi.goal ? goalStats(scoped, kpi.goal) : null,
      timeseries(scoped, "visitors", ctx.granularity),
      scopedPrev ? timeseries(scopedPrev, "visitors", ctx.granularity) : null,
    ]);
    return {
      path,
      flow,
      vitals: v,
      goal: g,
      trend: {
        current: toPoints(cur),
        previous: before ? toPoints(before) : null,
      },
    };
  };

  return {
    view,
    granularity: ctx.granularity,
    timezone: ctx.timezone,
    compare: prev !== null,
    kpi,
    sel: state.sel,
    table: settle("pages.table", tablePromise),
    selected: settle("pages.selected", selected()),
  };
}
