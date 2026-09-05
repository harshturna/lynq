"use server";

import type {
  Breakdown,
  BreakdownKey,
  DashboardData,
  DashboardEvent,
  Point,
  SummaryNumbers,
  UiFilter,
} from "@/lib/dashboard-types";
import { BREAKDOWN_KEYS } from "@/lib/dashboard-types";
import { authorize, buildContext } from "@/lib/query/authorize";
import type { Filter } from "@/lib/query/filters";
import type { Metric } from "@/lib/query/primitives";
import type { Range } from "@/lib/query/ranges";
import { breakdown, rows, summary, timeseries, vitals } from "@/lib/query/run";
import { getUser } from "@/lib/user/server";

/**
 * The one server action behind the site dashboard (TICKET-023): every number
 * comes from lib/query, filtered and ranged on the server, so the client only
 * renders. Same shapes as before, computed on the whole data set.
 */
const RANGES: Record<DatePickerValues, Range> = {
  Today: "last_24h",
  "Last 7 days": "last_7d",
  "Last 30 days": "last_30d",
  "Last 3 months": "last_90d",
  "Last 12 months": "last_12mo",
};

/**
 * The Referrers and Sources cards count sessions by the referrer and source
 * the session arrived with (TICKET-027); the other cards count pageviews.
 */
const QUERY_DIMENSION: Record<BreakdownKey, string> = {
  path: "path",
  referrer: "entry_referrer",
  source: "entry_source",
  device: "device",
  browser: "browser",
  os: "os",
  country: "country",
};
const QUERY_METRIC: Record<BreakdownKey, Metric> = {
  path: "pageviews",
  referrer: "sessions",
  source: "sessions",
  device: "pageviews",
  browser: "pageviews",
  os: "pageviews",
  country: "pageviews",
};

/** UI chips (one value each) to query filters: OR within a dimension, AND across. */
function toQueryFilters(chips: UiFilter[]): Filter[] {
  const byDim = new Map<BreakdownKey, string[]>();
  for (const c of chips) {
    if (!BREAKDOWN_KEYS.includes(c.dimension)) continue;
    const list = byDim.get(c.dimension) ?? [];
    if (!list.includes(c.value)) list.push(String(c.value).slice(0, 512));
    byDim.set(c.dimension, list);
  }
  return [...byDim].map(([dimension, values]) => ({
    dimension: QUERY_DIMENSION[dimension],
    op: "is" as const,
    values,
  }));
}

const toPoints = (series: { bucket: Date; value: number }[]): Point[] =>
  series.map((p) => ({ t: p.bucket.toISOString(), v: p.value }));

export async function getDashboard(
  websiteUrl: string,
  timeFrame: DatePickerValues,
  chips: UiFilter[] = []
): Promise<{ data: DashboardData | null; error: string | null }> {
  const user = await getUser();
  if (!user?.id) return { data: null, error: "Unauthorized User" };
  const site = await authorize(
    { kind: "session", userId: user.id },
    { url: websiteUrl }
  );
  if (!site) return { data: null, error: "Unauthorized User" };
  const range = RANGES[timeFrame];
  if (!range) return { data: null, error: "Invalid time frame" };

  try {
    const ctx = {
      ...buildContext(site, {
        range,
        compare: "previous_period",
        filters: toQueryFilters(chips),
      }),
      // the old dashboard's sixteen queries share the pool; TICKET-035 replaces it (design §9)
      timeoutMs: 10_000,
    };
    const [sum, pageviews, sessions, vit, events, ...breaks] =
      await Promise.all([
        summary(ctx),
        timeseries(ctx, "pageviews", ctx.granularity),
        timeseries(ctx, "sessions", ctx.granularity),
        vitals(ctx),
        rows<DashboardEvent & { ts: Date }>(ctx, "events", { limit: 200 }),
        ...BREAKDOWN_KEYS.map((key) =>
          breakdown(ctx, QUERY_DIMENSION[key], QUERY_METRIC[key], { limit: 50 })
        ),
      ]);
    const breakdowns = Object.fromEntries(
      BREAKDOWN_KEYS.map((key, i) => [key, breaks[i] as Breakdown])
    ) as Record<BreakdownKey, Breakdown>;
    return {
      data: {
        timeFrame,
        granularity: ctx.granularity,
        range: {
          from: ctx.range.from.toISOString(),
          to: ctx.range.toExclusive.toISOString(),
        },
        summary: {
          current: sum.current as SummaryNumbers,
          compare: (sum.compare as SummaryNumbers | null) ?? null,
        },
        series: {
          pageviews: toPoints(pageviews),
          sessions: toPoints(sessions),
        },
        breakdowns,
        vitals: vit,
        events: events.map((e) => ({
          id: String(e.id),
          ts: new Date(e.ts).toISOString(),
          name: e.name,
          props: e.props ?? {},
          path: e.path,
          country: e.country,
          city: e.city,
          device: e.device,
          browser: e.browser,
          os: e.os,
        })),
      },
      error: null,
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        lynq: "dashboard_failed",
        error: error instanceof Error ? error.message : String(error),
      })
    );
    return { data: null, error: "Failed to load analytics" };
  }
}
