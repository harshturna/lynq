import { type Compiled, Query } from "./builder";
import { compileFilters } from "./filters";
import { type QueryContext, rowFrom } from "./primitives";

/**
 * Histogram (design §9.8): counts per band of an allow-listed numeric
 * column, using width_bucket over the edges. Bucket 0 is below the first
 * edge and bucket n is at or above the last; callers usually pass 0 as the
 * first edge and drop the last bucket or label it "and above".
 */
export const HISTOGRAM_COLUMNS = {
  viewport_width: { event: "pageview" },
  viewport_height: { event: "pageview" },
  screen_width: { event: "pageview" },
  lcp: { event: "vitals" },
  inp: { event: "vitals" },
  cls: { event: "vitals" },
  fcp: { event: "vitals" },
  ttfb: { event: "vitals" },
} as const;
export type HistogramColumn = keyof typeof HISTOGRAM_COLUMNS;

export type HistogramRow = { bucket: number; count: number };

export function histogramQuery(
  ctx: QueryContext,
  column: HistogramColumn,
  edges: number[],
  w = ctx.range
): Compiled {
  const spec = HISTOGRAM_COLUMNS[column];
  if (!spec)
    throw new Error(
      `histogram takes one of ${Object.keys(HISTOGRAM_COLUMNS).join(", ")}`
    );
  if (edges.length < 1 || edges.length > 64)
    throw new Error("histogram takes 1 to 64 edges");
  const sorted = [...edges].sort((a, b) => a - b);
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const r = rowFrom(q, ctx, w, f);
  return {
    text: `${r.withClause}
select width_bucket(e.${column}::float8, ${q.p(sorted)}::float8[])::int as bucket, count(*)::int as count
from ${r.from}
where ${r.where} and e.event = ${q.p(spec.event)} and e.${column} > 0
group by 1 order by 1`,
    params: q.params,
  };
}

/** Every band between consecutive edges, plus one for "at or above the last edge". */
export function fillHistogram(
  rows: HistogramRow[],
  edges: number[]
): { from: number; to: number | null; count: number }[] {
  const sorted = [...edges].sort((a, b) => a - b);
  const by = new Map(rows.map((r) => [Number(r.bucket), Number(r.count)]));
  const out: { from: number; to: number | null; count: number }[] = [];
  for (let i = 1; i <= sorted.length; i++)
    out.push({
      from: sorted[i - 1],
      to: i < sorted.length ? sorted[i] : null,
      count: by.get(i) ?? 0,
    });
  return out;
}
