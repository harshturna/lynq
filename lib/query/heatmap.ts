import { type Compiled, Query } from "./builder";
import {
  compileFilters,
  isRowDimension,
  type RowDimension,
  rowExpr,
} from "./filters";
import { type QueryContext, rowFrom } from "./primitives";

/**
 * Heatmap (design §9.7): visitors per value and hour of day in the site's
 * timezone, long form; TypeScript pivots to 24 columns. Values are the top
 * N by visitors so the chart stays readable.
 */
export type HeatmapCell = { value: string; hour: number; count: number };

export function heatmapQuery(
  ctx: QueryContext,
  dimension: string,
  limit = 12,
  w = ctx.range
): Compiled {
  if (!isRowDimension(dimension))
    throw new Error(`heatmap takes a row dimension, not ${dimension}`);
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const r = rowFrom(q, ctx, w, f);
  const expr = rowExpr(dimension as RowDimension, "e");
  const n = Math.min(Math.max(limit, 1), 50);
  return {
    text: `${r.withClause}${r.withClause ? "," : "with"} rows as (
  select ${expr}::text as value, extract(hour from e.ts at time zone ${q.p(ctx.timezone)})::int as hour, e.visitor_id
  from ${r.from}
  where ${r.where} and e.event = 'pageview' and ${expr} is not null and ${expr}::text <> ''),
top as (select value from rows group by 1 order by count(distinct visitor_id) desc, 1 limit ${q.p(n)})
select value, hour, count(distinct visitor_id)::int as count
from rows join top using (value)
group by 1, 2
order by 1, 2`,
    params: q.params,
  };
}

/** Long form to rows of 24 hours, in the order the query ranked the values. */
export function pivotHeatmap(
  cells: HeatmapCell[]
): { value: string; hours: number[] }[] {
  const by = new Map<string, number[]>();
  for (const c of cells) {
    let hours = by.get(c.value);
    if (!hours) {
      hours = new Array(24).fill(0);
      by.set(c.value, hours);
    }
    hours[c.hour] = Number(c.count);
  }
  return [...by]
    .map(([value, hours]) => ({ value, hours }))
    .sort(
      (a, b) =>
        b.hours.reduce((x, y) => x + y, 0) - a.hours.reduce((x, y) => x + y, 0)
    );
}
