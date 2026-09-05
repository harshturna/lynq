import "server-only";
import { withTimeout } from "@/lib/db";
import {
  type BreakdownMultiOptions,
  type BreakdownMultiRow,
  breakdownMultiQuery,
  type MetricSpec,
} from "./breakdown";
import type { Compiled } from "./builder";
import { type FlowRow, pageFlowQuery } from "./flow";
import {
  type FunnelStep,
  funnelQuery,
  type GoalDef,
  type GoalStats,
  goalStatsQuery,
  goalTimeseriesQuery,
} from "./goals";
import { type HeatmapCell, heatmapQuery, pivotHeatmap } from "./heatmap";
import {
  fillHistogram,
  type HistogramColumn,
  type HistogramRow,
  histogramQuery,
} from "./histogram";
import { type PathRow, pathsToQuery } from "./paths";
import {
  type BreakdownOptions,
  type BreakdownRow,
  breakdownQuery,
  fillSeries,
  type Metric,
  type QueryContext,
  type RowsKind,
  type RowsOptions,
  rowsQuery,
  type SeriesPoint,
  type Summary,
  summaryQueries,
  timeseriesQuery,
} from "./primitives";
import { buckets, type Granularity } from "./ranges";
import { fillMinutes, type RealtimeRow, realtimeQuery } from "./realtime";
import { type Revenue, revenueQuery } from "./revenue";
import { trendsQuery } from "./trends";
import {
  type VitalsRow,
  type VitalsSummary,
  vitalsBreakdownQuery,
  vitalsQuery,
  vitalsTimeseriesQuery,
} from "./vitals";

/**
 * Per-screen statement timeout (design §9): over budget fails the section,
 * not the pool. The design named 1.5 s; measured on the production pooler
 * (TICKET-035, 183k rows) the multi-metric breakdowns alone take 1.3 to
 * 1.7 s at twelve months, so 5 s keeps long ranges rendering until the
 * daily rollup (TICKET-049) brings them back under the budget.
 */
export const DEFAULT_TIMEOUT_MS = 5_000;

/** Executes a compiled query with the read timeout (design §14). */
export async function run<T extends Record<string, unknown>>(
  compiled: Compiled,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T[]> {
  return withTimeout(timeoutMs, async (tx) => {
    const rows = await tx.unsafe(compiled.text, compiled.params as never[]);
    return rows as unknown as T[];
  });
}

export async function timeseries(
  ctx: QueryContext,
  metric: Metric,
  granularity: Granularity
): Promise<SeriesPoint[]> {
  const rows = await run<{ bucket: Date; value: number }>(
    timeseriesQuery(ctx, metric, granularity),
    ctx.timeoutMs
  );
  return fillSeries(rows, ctx.range, granularity, ctx.timezone);
}

export async function breakdown(
  ctx: QueryContext,
  dimension: string,
  metric: Metric,
  opts: BreakdownOptions = {}
): Promise<{ rows: BreakdownRow[]; total: number }> {
  const rows = await run<{ value: string; metric: number; total: number }>(
    breakdownQuery(ctx, dimension, metric, opts),
    ctx.timeoutMs
  );
  return {
    rows: rows.map((r) => ({ value: r.value, metric: Number(r.metric) })),
    total: rows[0] ? Number(rows[0].total) : 0,
  };
}

async function summaryFor(
  ctx: QueryContext,
  w: { from: Date; toExclusive: Date }
): Promise<Summary> {
  const { rows, sessions } = summaryQueries(ctx, w);
  const [[r], [s]] = await Promise.all([
    run<Record<string, number>>(rows, ctx.timeoutMs),
    run<Record<string, number>>(sessions, ctx.timeoutMs),
  ]);
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries({ ...(r ?? {}), ...(s ?? {}) }))
    out[k] = Number(v ?? 0);
  return out as Summary;
}

/** Every scalar metric for the range and, when set, the comparison range. */
export async function summary(
  ctx: QueryContext
): Promise<{ current: Summary; compare: Summary | null }> {
  const [current, compare] = await Promise.all([
    summaryFor(ctx, ctx.range),
    ctx.compare ? summaryFor(ctx, ctx.compare) : null,
  ]);
  return { current, compare };
}

export async function rows<T extends Record<string, unknown>>(
  ctx: QueryContext,
  kind: RowsKind,
  opts: RowsOptions = {}
): Promise<T[]> {
  return run<T>(rowsQuery(ctx, kind, opts), ctx.timeoutMs);
}

/** p75 per vital column plus average resources and the sample count. */
export async function vitals(ctx: QueryContext): Promise<VitalsSummary> {
  const [row] = await run<Record<string, number | null>>(
    vitalsQuery(ctx),
    ctx.timeoutMs
  );
  const out: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(row ?? {}))
    out[k] = v === null || v === undefined ? null : Number(v);
  return { ...out, samples: Number(row?.samples ?? 0) } as VitalsSummary;
}

const num = (v: unknown): number => Number(v ?? 0);
const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

/** Several metrics per value, one or two dimensions (design §9.2, §9.3). */
export async function breakdownMulti(
  ctx: QueryContext,
  dimension: string | [string, string],
  metrics: MetricSpec[],
  opts: BreakdownMultiOptions = {}
): Promise<{ rows: BreakdownMultiRow[]; total: number }> {
  const rows = await run<BreakdownMultiRow>(
    breakdownMultiQuery(ctx, dimension, metrics, opts),
    ctx.timeoutMs
  );
  return {
    rows: rows.map((r) => {
      const out: Record<string, number | string | null> = {};
      for (const [k, v] of Object.entries(r)) {
        if (k === "value" || k === "value2") out[k] = v as string;
        else if (k === "last_seen")
          out[k] =
            (v as unknown) instanceof Date
              ? (v as unknown as Date).toISOString()
              : (v as string | null);
        else out[k] = numOrNull(v);
      }
      return out as BreakdownMultiRow;
    }),
    total: rows[0] ? num(rows[0].total) : 0,
  };
}

/** The last 30 minutes by received_at, in one statement (design §9.4). */
export async function realtime(
  ctx: QueryContext,
  now = new Date()
): Promise<RealtimeRow> {
  const [row] = await run<RealtimeRow>(realtimeQuery(ctx, now), ctx.timeoutMs);
  return {
    visitors_now: num(row?.visitors_now),
    per_minute: fillMinutes(row?.per_minute ?? [], now),
    pages: row?.pages ?? [],
    sources: row?.sources ?? [],
    countries: row?.countries ?? [],
    events: row?.events ?? [],
  };
}

/** Came from and went to, for one page (design §9.5). */
export async function pageFlow(
  ctx: QueryContext,
  path: string
): Promise<FlowRow[]> {
  const rows = await run<FlowRow>(pageFlowQuery(ctx, path), ctx.timeoutMs);
  return rows.map((r) => ({ ...r, count: num(r.count) }));
}

export async function goalStats(
  ctx: QueryContext,
  goal: GoalDef
): Promise<GoalStats> {
  const [r] = await run<Record<string, unknown>>(
    goalStatsQuery(ctx, goal),
    ctx.timeoutMs
  );
  const sessions = num(r?.sessions);
  const converting = num(r?.converting_sessions);
  return {
    completions: num(r?.completions),
    converting_sessions: converting,
    sessions,
    conversion: sessions
      ? Math.round((converting / sessions) * 10000) / 100
      : 0,
    revenue: num(r?.revenue),
    median_seconds: numOrNull(r?.median_seconds),
  };
}

/** Sessions reaching each step, in order (design §9.6). */
export async function funnel(
  ctx: QueryContext,
  steps: FunnelStep[]
): Promise<number[]> {
  const [r] = await run<Record<string, number>>(
    funnelQuery(ctx, steps),
    ctx.timeoutMs
  );
  return steps.map((_, i) => num(r?.[`s${i}`]));
}

/** Top values by hour of day in the site timezone (design §9.7). */
export async function heatmap(
  ctx: QueryContext,
  dimension: string,
  limit = 12
): Promise<{ value: string; hours: number[] }[]> {
  const cells = await run<HeatmapCell>(
    heatmapQuery(ctx, dimension, limit),
    ctx.timeoutMs
  );
  return pivotHeatmap(cells);
}

/** Counts per band of a numeric column (design §9.8). */
export async function histogram(
  ctx: QueryContext,
  column: HistogramColumn,
  edges: number[]
): Promise<{ from: number; to: number | null; count: number }[]> {
  const rows = await run<HistogramRow>(
    histogramQuery(ctx, column, edges),
    ctx.timeoutMs
  );
  return fillHistogram(rows, edges);
}

/** The last pages before an event, by sequence (design §9.9). */
export async function pathsTo(
  ctx: QueryContext,
  event: string,
  limit = 10
): Promise<PathRow[]> {
  const rows = await run<PathRow>(
    pathsToQuery(ctx, event, limit),
    ctx.timeoutMs
  );
  return rows.map((r) => ({ steps: r.steps, count: num(r.count) }));
}

/** p75 per rendered vital by a dimension (design §9.10). */
export async function vitalsBreakdown(
  ctx: QueryContext,
  dimension: string,
  limit = 20
): Promise<(VitalsRow & { value: string })[]> {
  const rows = await run<Record<string, unknown>>(
    vitalsBreakdownQuery(ctx, dimension, limit),
    ctx.timeoutMs
  );
  return rows.map(vitalsRow) as (VitalsRow & { value: string })[];
}

/** p75 per rendered vital per bucket and device (design §9.10). */
export async function vitalsTimeseries(
  ctx: QueryContext,
  granularity: Granularity
): Promise<(VitalsRow & { bucket: string; device: string })[]> {
  const rows = await run<Record<string, unknown>>(
    vitalsTimeseriesQuery(ctx, granularity),
    ctx.timeoutMs
  );
  return rows.map((r) => ({
    ...vitalsRow(r),
    bucket: (r.bucket as Date).toISOString(),
    device: r.device as string,
  })) as (VitalsRow & { bucket: string; device: string })[];
}

function vitalsRow(r: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...r };
  for (const k of ["lcp", "cls", "inp", "fcp", "ttfb"])
    out[k] = numOrNull(r[k]);
  out.samples = num(r.samples);
  return out;
}

/** Completions per bucket over the context's range (design §8.1). */
export async function goalTimeseries(
  ctx: QueryContext,
  goal: GoalDef,
  granularity: Granularity
): Promise<SeriesPoint[]> {
  const rows = await run<{ bucket: Date; value: number }>(
    goalTimeseriesQuery(ctx, goal, granularity),
    ctx.timeoutMs
  );
  return fillSeries(rows, ctx.range, granularity, ctx.timezone);
}

/** Visitors per bucket for a few values of a row dimension, zero-filled, keyed by value (design §8.3). */
export async function trends(
  ctx: QueryContext,
  dimension: string,
  values: string[],
  granularity: Granularity
): Promise<Map<string, number[]>> {
  const rows = await run<{ value: string; bucket: Date; n: number }>(
    trendsQuery(ctx, dimension, values, granularity),
    ctx.timeoutMs
  );
  const times = buckets(
    ctx.range.from,
    ctx.range.toExclusive,
    granularity,
    ctx.timezone
  ).map((b) => b.getTime());
  const out = new Map<string, number[]>();
  for (const v of values)
    out.set(
      v,
      times.map(() => 0)
    );
  for (const r of rows) {
    const series = out.get(r.value);
    const i = times.indexOf(new Date(r.bucket).getTime());
    if (series && i >= 0) series[i] = Number(r.n);
  }
  return out;
}

/** Revenue and payments over the range (design §8.0). */
export async function revenue(ctx: QueryContext): Promise<Revenue> {
  const [r] = await run<Record<string, unknown>>(
    revenueQuery(ctx),
    ctx.timeoutMs
  );
  return { revenue: num(r?.revenue), payments: num(r?.payments) };
}
