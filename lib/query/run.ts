import "server-only";
import { withTimeout } from "@/lib/db";
import type { Compiled } from "./builder";
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
import type { Granularity } from "./ranges";
import { type VitalsSummary, vitalsQuery } from "./vitals";

/** Executes a compiled query with the read timeout (design §14). */
export async function run<T extends Record<string, unknown>>(
  compiled: Compiled,
  timeoutMs = 30_000
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
    timeseriesQuery(ctx, metric, granularity)
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
    breakdownQuery(ctx, dimension, metric, opts)
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
    run<Record<string, number>>(rows),
    run<Record<string, number>>(sessions),
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
  return run<T>(rowsQuery(ctx, kind, opts));
}

/** p75 per vital column plus average resources and the sample count. */
export async function vitals(ctx: QueryContext): Promise<VitalsSummary> {
  const [row] = await run<Record<string, number | null>>(vitalsQuery(ctx));
  const out: Record<string, number | null> = {};
  for (const [k, v] of Object.entries(row ?? {}))
    out[k] = v === null || v === undefined ? null : Number(v);
  return { ...out, samples: Number(row?.samples ?? 0) } as VitalsSummary;
}
