import { type Compiled, Query } from "./builder";
import {
  compileFilters,
  isRowDimension,
  type RowDimension,
  rowExpr,
} from "./filters";
import { bucketExpr, type QueryContext, rowFrom } from "./primitives";
import type { Granularity } from "./ranges";
import { sessionCte, sessionWhere } from "./sessions";

/**
 * Per-metric p75 for the Performance tab (design §8.4, §16): each vital
 * column is a separate percentile so a row that reported only FCP counts
 * for FCP and nothing else; NULLs fall out of percentile_cont for free.
 */
export const VITAL_COLUMNS = [
  "lcp",
  "cls",
  "inp",
  "fcp",
  "ttfb",
  "dcl",
  "load",
  "tti",
  "tbt",
] as const;
export type VitalColumn = (typeof VITAL_COLUMNS)[number];

export type VitalsSummary = Record<VitalColumn, number | null> & {
  resources: number | null;
  samples: number;
};

export function vitalsQuery(ctx: QueryContext, w = ctx.range): Compiled {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const scope = `e.site_id = ${q.p(ctx.siteId)} and e.ts >= ${q.p(w.from)} and e.ts < ${q.p(w.toExclusive)}${ctx.includeSuspect ? "" : " and not e.suspect"}`;
  const withClause = f.hasSession
    ? `with ${sessionCte(q, { siteId: ctx.siteId, from: w.from, toExclusive: w.toExclusive, includeSuspect: ctx.includeSuspect ?? false }, f)}`
    : "";
  const from = f.hasSession
    ? "analytics.events e join sess s using (visitor_id, session_id)"
    : "analytics.events e";
  const where = `${scope} and e.event = 'vitals' and ${f.rowWhere}${f.hasSession ? ` and ${sessionWhere(f)}` : ""}`;
  const cols = VITAL_COLUMNS.map(
    (c) =>
      `percentile_cont(0.75) within group (order by e.${c})::float8 as ${c}`
  ).join(",\n       ");
  return {
    text: `${withClause}
select ${cols},
       round(avg(e.resources))::float8 as resources,
       count(*)::int as samples
from ${from}
where ${where}`,
    params: q.params,
  };
}

/** The five vitals the screens render (design §8.9). */
export const RENDERED_VITALS = ["lcp", "cls", "inp", "fcp", "ttfb"] as const;
export type RenderedVital = (typeof RENDERED_VITALS)[number];
export type VitalsRow = Record<RenderedVital, number | null> & {
  samples: number;
};

const renderedCols = () =>
  RENDERED_VITALS.map(
    (c) =>
      `percentile_cont(0.75) within group (order by e.${c})::float8 as ${c}`
  ).join(",\n       ");

/** p75 per rendered vital by a row dimension, largest sample counts first (design §9.10). */
export function vitalsBreakdownQuery(
  ctx: QueryContext,
  dimension: string,
  limit = 20,
  w = ctx.range
): Compiled {
  if (!isRowDimension(dimension))
    throw new Error(`vitals breakdown takes a row dimension, not ${dimension}`);
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const r = rowFrom(q, ctx, w, f);
  const expr = rowExpr(dimension as RowDimension, "e");
  const n = Math.min(Math.max(limit, 1), 200);
  return {
    text: `${r.withClause}
select ${expr}::text as value,
       ${renderedCols()},
       count(*)::int as samples
from ${r.from}
where ${r.where} and e.event = 'vitals' and ${expr} is not null and ${expr}::text <> ''
group by 1 order by samples desc, 1 limit ${q.p(n)}`,
    params: q.params,
  };
}

/** p75 per rendered vital per bucket, split by device (design §9.10). */
export function vitalsTimeseriesQuery(
  ctx: QueryContext,
  granularity: Granularity,
  w = ctx.range
): Compiled {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const r = rowFrom(q, ctx, w, f);
  return {
    text: `${r.withClause}
select ${bucketExpr(q, "e.ts", granularity, ctx.timezone)} as bucket, e.device,
       ${renderedCols()},
       count(*)::int as samples
from ${r.from}
where ${r.where} and e.event = 'vitals'
group by 1, 2 order by 1, 2`,
    params: q.params,
  };
}

/** Attribution targets (design §8.9): the LCP element or INP target selectors, grouped. */
export const TARGET_COLUMNS = {
  lcp_target: "lcp",
  inp_target: "inp",
} as const;
export type TargetColumn = keyof typeof TARGET_COLUMNS;

export function vitalsTargetsQuery(
  ctx: QueryContext,
  column: TargetColumn,
  limit = 5,
  w = ctx.range
): Compiled {
  const metric = TARGET_COLUMNS[column];
  if (!metric) throw new Error(`unknown target column ${column}`);
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const r = rowFrom(q, ctx, w, f);
  const n = Math.min(Math.max(limit, 1), 50);
  return {
    text: `${r.withClause}
select e.${column}::text as value,
       count(*)::int as samples,
       percentile_cont(0.75) within group (order by e.${metric})::float8 as p75
from ${r.from}
where ${r.where} and e.event = 'vitals' and e.${column} is not null and e.${column} <> '' and e.${metric} is not null
group by 1 order by samples desc, 1 limit ${q.p(n)}`,
    params: q.params,
  };
}
