import { type Compiled, Query } from "./builder";
import { compileFilters } from "./filters";
import type { QueryContext } from "./primitives";
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
