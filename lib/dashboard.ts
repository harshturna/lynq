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
import type { QueryContext } from "@/lib/query/primitives";
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
    dimension,
    op: "is" as const,
    values,
  }));
}

const toPoints = (series: { bucket: Date; value: number }[]): Point[] =>
  series.map((p) => ({ t: p.bucket.toISOString(), v: p.value }));

/**
 * Breakdowns leave out the empty value, so direct traffic (no referrer, no
 * source) would vanish from those two cards. Count it separately: pageviews
 * whose referrer/source is '' grouped by channel, summed. Exact, and a chip
 * on the '' value filters the same way.
 */
async function directCount(
  ctx: QueryContext,
  dimension: "referrer" | "source"
): Promise<number> {
  const { rows } = await breakdown(
    {
      ...ctx,
      filters: [...ctx.filters, { dimension, op: "is", values: [""] }],
    },
    "channel",
    "pageviews",
    { limit: 10 }
  );
  return rows.reduce((sum, r) => sum + r.metric, 0);
}

const withDirect = (b: Breakdown, direct: number): Breakdown =>
  direct > 0
    ? {
        rows: [...b.rows, { value: "", metric: direct }].sort(
          (a, z) => z.metric - a.metric
        ),
        total: b.total + 1,
      }
    : b;

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
    const ctx = buildContext(site, {
      range,
      compare: "previous_period",
      filters: toQueryFilters(chips),
    });
    const [
      sum,
      pageviews,
      sessions,
      vit,
      events,
      directReferrer,
      directSource,
      ...breaks
    ] = await Promise.all([
      summary(ctx),
      timeseries(ctx, "pageviews", ctx.granularity),
      timeseries(ctx, "sessions", ctx.granularity),
      vitals(ctx),
      rows<DashboardEvent & { ts: Date }>(ctx, "events", { limit: 200 }),
      directCount(ctx, "referrer"),
      directCount(ctx, "source"),
      ...BREAKDOWN_KEYS.map((key) =>
        breakdown(ctx, key, "pageviews", { limit: 50 })
      ),
    ]);
    const breakdowns = Object.fromEntries(
      BREAKDOWN_KEYS.map((key, i) => [key, breaks[i] as Breakdown])
    ) as Record<BreakdownKey, Breakdown>;
    breakdowns.referrer = withDirect(breakdowns.referrer, directReferrer);
    breakdowns.source = withDirect(breakdowns.source, directSource);
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
