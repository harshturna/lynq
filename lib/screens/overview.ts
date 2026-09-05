import "server-only";
import type { Point } from "@/lib/charts/format";
import type { BuiltContext } from "@/lib/query/authorize";
import type { BreakdownMultiRow, MetricSpec } from "@/lib/query/breakdown";
import type { GoalStats } from "@/lib/query/goals";
import type { Metric, Summary } from "@/lib/query/primitives";
import type { Granularity } from "@/lib/query/ranges";
import {
  breakdownMulti,
  funnel,
  goalStats,
  goalTimeseries,
  summary,
  timeseries,
  vitals,
} from "@/lib/query/run";
import type { VitalsSummary } from "@/lib/query/vitals";
import {
  DEFAULT_METRIC,
  type OverviewMetric,
  type ViewState,
} from "@/lib/url-state";
import type { Kpi } from "./kpi";
import { type Section, settle } from "./settle";

/**
 * The Overview (design §8.1, §10): every query starts at once and each
 * section is a settled promise the page awaits in its own Suspense child.
 */
export type TableView = {
  key: string;
  dimension: string;
  metrics: MetricSpec[];
};

export const PAGE_VIEWS: TableView[] = [
  {
    key: "top",
    dimension: "path",
    metrics: ["visitors", "pageviews", "bounce_rate", "engaged_time"],
  },
  {
    key: "entry",
    dimension: "entry_path",
    metrics: ["sessions", "visitors", "bounce_rate", "engaged_time"],
  },
  {
    key: "exit",
    dimension: "exit_path",
    metrics: ["sessions", "visitors", "bounce_rate", "engaged_time"],
  },
];

/** Sources columns follow the KPI state (design §8.0). */
export function sourceViews(kpi: Kpi): TableView[] {
  const metrics: MetricSpec[] = ["visitors", "sessions", "bounce_rate"];
  if (kpi.goal) {
    metrics.push({ kind: "goal_completions", goal: kpi.goal });
    metrics.push({ kind: "conversion", goal: kpi.goal });
  }
  if (kpi.hasRevenue) metrics.push("revenue");
  return [
    { key: "channels", dimension: "entry_channel", metrics },
    { key: "sources", dimension: "entry_source", metrics },
    { key: "campaigns", dimension: "entry_utm_campaign", metrics },
  ];
}

export const LOCATION_VIEWS: TableView[] = [
  {
    key: "countries",
    dimension: "country",
    metrics: ["visitors", "pageviews", "bounce_rate"],
  },
  {
    key: "regions",
    dimension: "region",
    metrics: ["visitors", "pageviews", "bounce_rate"],
  },
  {
    key: "cities",
    dimension: "city",
    metrics: ["visitors", "pageviews", "bounce_rate"],
  },
];

export const TABLE_LIMIT = 200;

export type TableData = {
  view: string;
  dimension: string;
  rows: BreakdownMultiRow[];
  /** Previous-period rows by value, when compare is on. */
  previous: Record<string, BreakdownMultiRow> | null;
  total: number;
};

export type SeriesData = {
  metric: OverviewMetric;
  label: string;
  current: Point[];
  previous: Point[] | null;
};

export type GoalData = {
  stats: GoalStats;
  previous: GoalStats | null;
  /** Sessions that reached the goal step of the two-step funnel. */
  reached: number;
};

export type DevicesData = {
  rows: BreakdownMultiRow[];
  previous: Record<string, BreakdownMultiRow> | null;
};

export type OverviewScreen = {
  metric: OverviewMetric;
  granularity: Granularity;
  timezone: string;
  compare: boolean;
  kpi: Kpi;
  summary: Promise<Section<{ current: Summary; compare: Summary | null }>>;
  series: Promise<Section<SeriesData>>;
  goal: Promise<Section<GoalData | null>>;
  devices: Promise<Section<DevicesData>>;
  pages: Promise<Section<TableData>>;
  sources: Promise<Section<TableData>>;
  locations: Promise<Section<TableData>>;
  vitals: Promise<Section<VitalsSummary>>;
};

const METRIC_LABEL: Record<OverviewMetric, string> = {
  visitors: "Unique visitors",
  sessions: "Sessions",
  pageviews: "Pageviews",
  bounce_rate: "Bounce rate",
  engaged_time: "Engaged time",
  kpi: "KPI",
};

const toPoints = (s: { bucket: Date; value: number }[]): Point[] =>
  s.map((p) => ({ t: p.bucket.toISOString(), v: p.value }));

const byValue = (rows: BreakdownMultiRow[]) =>
  Object.fromEntries(rows.map((r) => [r.value, r]));

export function getOverviewScreen(
  ctx: BuiltContext,
  state: ViewState,
  kpi: Kpi
): OverviewScreen {
  const prev: BuiltContext | null = ctx.compare
    ? { ...ctx, range: ctx.compare, compare: undefined }
    : null;
  const metric: OverviewMetric =
    state.metric === "kpi" && !kpi.goal
      ? DEFAULT_METRIC
      : (state.metric ?? DEFAULT_METRIC);

  const table = async (
    views: TableView[],
    region: string
  ): Promise<TableData> => {
    const view = views.find((v) => v.key === state.view[region]) ?? views[0];
    const [cur, before] = await Promise.all([
      breakdownMulti(ctx, view.dimension, view.metrics, { limit: TABLE_LIMIT }),
      prev
        ? breakdownMulti(prev, view.dimension, view.metrics, {
            limit: TABLE_LIMIT,
          })
        : null,
    ]);
    return {
      view: view.key,
      dimension: view.dimension,
      rows: cur.rows,
      previous: before ? byValue(before.rows) : null,
      total: cur.total,
    };
  };

  const series = async (): Promise<SeriesData> => {
    const g = ctx.granularity;
    if (metric === "kpi" && kpi.goal) {
      const goal = kpi.goal;
      const [cur, before] = await Promise.all([
        goalTimeseries(ctx, goal, g),
        prev ? goalTimeseries(prev, goal, g) : null,
      ]);
      return {
        metric,
        label: goal.name,
        current: toPoints(cur),
        previous: before ? toPoints(before) : null,
      };
    }
    const m = metric as Metric;
    const [cur, before] = await Promise.all([
      timeseries(ctx, m, g),
      prev ? timeseries(prev, m, g) : null,
    ]);
    return {
      metric,
      label: METRIC_LABEL[metric],
      current: toPoints(cur),
      previous: before ? toPoints(before) : null,
    };
  };

  const goal = async (): Promise<GoalData | null> => {
    if (!kpi.goal) return null;
    const g = kpi.goal;
    const [stats, before, steps] = await Promise.all([
      goalStats(ctx, g),
      prev ? goalStats(prev, g) : null,
      funnel(ctx, [{ kind: "any" }, { kind: g.kind, match: g.match }]),
    ]);
    return { stats, previous: before, reached: steps[1] ?? 0 };
  };

  const devices = async (): Promise<DevicesData> => {
    const [cur, before] = await Promise.all([
      breakdownMulti(ctx, "device", ["visitors"], { limit: 6 }),
      prev ? breakdownMulti(prev, "device", ["visitors"], { limit: 6 }) : null,
    ]);
    return { rows: cur.rows, previous: before ? byValue(before.rows) : null };
  };

  return {
    metric,
    granularity: ctx.granularity,
    timezone: ctx.timezone,
    compare: prev !== null,
    kpi,
    summary: settle("overview.summary", summary(ctx)),
    series: settle("overview.series", series()),
    goal: settle("overview.goal", goal()),
    devices: settle("overview.devices", devices()),
    pages: settle("overview.pages", table(PAGE_VIEWS, "pages")),
    sources: settle("overview.sources", table(sourceViews(kpi), "sources")),
    locations: settle("overview.locations", table(LOCATION_VIEWS, "locations")),
    vitals: settle("overview.vitals", vitals(ctx)),
  };
}
