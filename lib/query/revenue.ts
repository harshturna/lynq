import { type Compiled, Query } from "./builder";
import { compileFilters } from "./filters";
import { type QueryContext, rowFrom } from "./primitives";

/** Revenue and payments over the range (design §8.0): any event carrying a revenue value. */
export type Revenue = { revenue: number; payments: number };

export function revenueQuery(ctx: QueryContext, w = ctx.range): Compiled {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const r = rowFrom(q, ctx, w, f);
  return {
    text: `${r.withClause}
select coalesce(sum(e.revenue), 0)::float8 as revenue, count(*) filter (where e.revenue is not null)::int as payments
from ${r.from}
where ${r.where}`,
    params: q.params,
  };
}
