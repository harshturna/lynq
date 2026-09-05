import { type Compiled, Query } from "./builder";
import {
  compileFilters,
  isRowDimension,
  type RowDimension,
  rowExpr,
} from "./filters";
import { bucketExpr, type QueryContext, rowFrom } from "./primitives";
import type { Granularity } from "./ranges";

/**
 * Sparkline series for the rows of a table (design §8.3 "trend"): unique
 * visitors per bucket for a handful of values of one row dimension, in one
 * statement, so ten rows do not cost ten queries.
 */
export const MAX_TREND_VALUES = 20;

export function trendsQuery(
  ctx: QueryContext,
  dimension: string,
  values: string[],
  granularity: Granularity,
  w = ctx.range
): Compiled {
  if (!isRowDimension(dimension))
    throw new Error(`trends take a row dimension, not ${dimension}`);
  if (values.length < 1 || values.length > MAX_TREND_VALUES)
    throw new Error(`trends take 1 to ${MAX_TREND_VALUES} values`);
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const r = rowFrom(q, ctx, w, f);
  const expr = rowExpr(dimension as RowDimension, "e");
  return {
    text: `${r.withClause}
select ${expr}::text as value, ${bucketExpr(q, "e.ts", granularity, ctx.timezone)} as bucket, count(distinct e.visitor_id)::int as n
from ${r.from}
where ${r.where} and e.event = 'pageview' and ${expr} = any(${q.p(values)}::text[])
group by 1, 2 order by 1, 2`,
    params: q.params,
  };
}
