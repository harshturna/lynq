import "server-only";
import type { BuiltContext } from "@/lib/query/authorize";
import type { BreakdownMultiRow, MetricSpec } from "@/lib/query/breakdown";
import type { GoalStats } from "@/lib/query/goals";
import type { Summary } from "@/lib/query/primitives";
import type { Revenue } from "@/lib/query/revenue";
import {
  breakdownMulti,
  goalStats,
  revenue as revenueOf,
  summary,
} from "@/lib/query/run";
import type { ViewState } from "@/lib/url-state";
import type { Kpi } from "./kpi";
import { type Section, settle } from "./settle";

/**
 * The Sources screen (design §8.4, §8.0): the strip and the quadrant follow
 * the KPI state; every table counts sessions by their entry (TICKET-027).
 */
export const SOURCES_TABLE_LIMIT = 200;
export const QUADRANT_POINTS = 30;

export type TileKind = "int" | "pct" | "duration" | "money";
export type StripTile = {
  key: string;
  label: string;
  kind: TileKind;
  value: number;
  previous: number | null;
  /** Lower is better (bounce). */
  lowerIsBetter?: boolean;
  /** "—" when the denominator was zero. */
  empty?: boolean;
};

export type QuadrantData = {
  points: { key: string; label: string; x: number; y: number; size: number }[];
  avgX: number;
  avgY: number;
  y: "conversion" | "engaged";
  size: "revenue" | "completions" | "visitors";
};

export type SourcesTable = {
  view: string;
  dimension: string;
  rows: BreakdownMultiRow[];
  previous: Record<string, BreakdownMultiRow> | null;
  total: number;
  /** Unique visitors in the range, the denominator of the share column. */
  visitors: number;
};

export type SourcesScreen = {
  compare: boolean;
  kpi: Kpi;
  strip: Promise<Section<StripTile[]>>;
  quadrant: Promise<Section<QuadrantData>>;
  channels: Promise<Section<SourcesTable>>;
  sources: Promise<Section<SourcesTable>>;
  campaigns: Promise<Section<SourcesTable>>;
};

const SOURCE_VIEWS: Record<string, string> = {
  sources: "entry_source",
  referrers: "entry_referrer",
};
const CAMPAIGN_VIEWS: Record<string, string> = {
  campaign: "entry_utm_campaign",
  medium: "entry_utm_medium",
  term: "entry_utm_term",
  content: "entry_utm_content",
};

function metricsFor(kpi: Kpi, base: MetricSpec[]): MetricSpec[] {
  const m = [...base];
  if (kpi.goal) {
    m.push({ kind: "goal_completions", goal: kpi.goal });
    m.push({ kind: "conversion", goal: kpi.goal });
  }
  if (kpi.hasRevenue) m.push("revenue");
  return m;
}

export function getSourcesScreen(
  ctx: BuiltContext,
  state: ViewState,
  kpi: Kpi
): SourcesScreen {
  const prev: BuiltContext | null = ctx.compare
    ? { ...ctx, range: ctx.compare, compare: undefined }
    : null;
  const sumP = summary(ctx);
  const goalP = kpi.goal
    ? Promise.all([
        goalStats(ctx, kpi.goal),
        prev ? goalStats(prev, kpi.goal) : null,
      ])
    : null;
  const revP = kpi.hasRevenue
    ? Promise.all([revenueOf(ctx), prev ? revenueOf(prev) : null])
    : null;

  const strip = async (): Promise<StripTile[]> => {
    const [sum, goal, rev] = await Promise.all([sumP, goalP, revP]);
    return stripTiles(kpi, sum, goal, rev);
  };

  const table = async (
    view: string,
    dimension: string,
    base: MetricSpec[]
  ): Promise<SourcesTable> => {
    const metrics = metricsFor(kpi, base);
    const [cur, before, sum] = await Promise.all([
      breakdownMulti(ctx, dimension, metrics, { limit: SOURCES_TABLE_LIMIT }),
      prev
        ? breakdownMulti(prev, dimension, metrics, {
            limit: SOURCES_TABLE_LIMIT,
          })
        : null,
      sumP,
    ]);
    return {
      view,
      dimension,
      rows: cur.rows,
      previous: before
        ? Object.fromEntries(before.rows.map((r) => [r.value, r]))
        : null,
      total: cur.total,
      visitors: sum.current.visitors,
    };
  };

  const quadrant = async (): Promise<QuadrantData> => {
    const [rows, sum, goal] = await Promise.all([
      breakdownMulti(
        ctx,
        "entry_source",
        metricsFor(kpi, ["visitors", "sessions", "engaged_time"]),
        { limit: QUADRANT_POINTS }
      ),
      sumP,
      goalP,
    ]);
    const y: QuadrantData["y"] = kpi.goal ? "conversion" : "engaged";
    const size: QuadrantData["size"] = kpi.hasRevenue
      ? "revenue"
      : kpi.goal
        ? "completions"
        : "visitors";
    const points = rows.rows
      .map((r) => ({
        key: r.value,
        label: r.value || "Direct",
        x: Number(r.visitors ?? 0),
        y:
          y === "conversion"
            ? Number(r.conversion ?? 0)
            : Number(r.engaged_time ?? 0) / 1000,
        size:
          size === "revenue"
            ? Number(r.revenue ?? 0)
            : size === "completions"
              ? Number(r.goal_completions ?? 0)
              : Number(r.visitors ?? 0),
      }))
      .filter((p) => p.x > 0);
    const avgX = points.length
      ? points.reduce((a, p) => a + p.x, 0) / points.length
      : 1;
    const g = goal?.[0];
    const avgY =
      y === "conversion"
        ? (g?.conversion ?? 0)
        : sum.current.engaged_time / 1000;
    return { points, avgX: Math.max(1, avgX), avgY, y, size };
  };

  const sourcesView = SOURCE_VIEWS[state.view.sources]
    ? state.view.sources
    : "sources";
  const campaignsView = CAMPAIGN_VIEWS[state.view.campaigns]
    ? state.view.campaigns
    : "campaign";
  return {
    compare: prev !== null,
    kpi,
    strip: settle("sources.strip", strip()),
    quadrant: settle("sources.quadrant", quadrant()),
    channels: settle(
      "sources.channels",
      table("channels", "entry_channel", [
        "visitors",
        "sessions",
        "bounce_rate",
      ])
    ),
    sources: settle(
      "sources.sources",
      table(sourcesView, SOURCE_VIEWS[sourcesView], [
        "visitors",
        "sessions",
        "bounce_rate",
      ])
    ),
    campaigns: settle(
      "sources.campaigns",
      table(campaignsView, CAMPAIGN_VIEWS[campaignsView], [
        "visitors",
        "sessions",
      ])
    ),
  };
}

function stripTiles(
  kpi: Kpi,
  sum: { current: Summary; compare: Summary | null },
  goal: [GoalStats, GoalStats | null] | null,
  rev: [Revenue, Revenue | null] | null
): StripTile[] {
  const cur = sum.current;
  const prev = sum.compare;
  const visitors: StripTile = {
    key: "visitors",
    label: "Visitors",
    kind: "int",
    value: cur.visitors,
    previous: prev?.visitors ?? null,
  };
  const engaged: StripTile = {
    key: "engaged_time",
    label: "Engaged time",
    kind: "duration",
    value: cur.engaged_time,
    previous: prev?.sessions ? prev.engaged_time : null,
    empty: !cur.sessions,
  };
  if (!kpi.goal || !goal) {
    return [
      visitors,
      {
        key: "sessions",
        label: "Sessions",
        kind: "int",
        value: cur.sessions,
        previous: prev?.sessions ?? null,
      },
      {
        key: "bounce_rate",
        label: "Bounce rate",
        kind: "pct",
        value: cur.bounce_rate,
        previous: prev?.sessions ? prev.bounce_rate : null,
        lowerIsBetter: true,
        empty: !cur.sessions,
      },
      engaged,
    ];
  }
  const [g, gp] = goal;
  const completions: StripTile = {
    key: "completions",
    label: kpi.goal.name,
    kind: "int",
    value: g.completions,
    previous: gp?.completions ?? null,
  };
  if (!kpi.hasRevenue || !rev) {
    return [
      visitors,
      completions,
      {
        key: "conversion",
        label: "Conversion",
        kind: "pct",
        value: g.conversion,
        previous: gp?.sessions ? gp.conversion : null,
        empty: !g.sessions,
      },
      engaged,
    ];
  }
  const [r, rp] = rev;
  return [
    visitors,
    completions,
    {
      key: "revenue",
      label: "Revenue",
      kind: "money",
      value: r.revenue,
      previous: rp?.revenue ?? null,
    },
    {
      key: "revenue_per_visitor",
      label: "Revenue per visitor",
      kind: "money",
      value: cur.visitors ? r.revenue / cur.visitors : 0,
      previous: prev?.visitors && rp ? rp.revenue / prev.visitors : null,
      empty: !cur.visitors,
    },
  ];
}
