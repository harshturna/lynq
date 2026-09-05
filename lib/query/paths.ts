import { type Compiled, Query } from "./builder";
import { compileFilters } from "./filters";
import { cteScope, type QueryContext, scope } from "./primitives";
import { sessionCte, sessionWhere } from "./sessions";

/**
 * Paths to an event (design §9.9): the last few pages a session saw before
 * its first completion of the event, counted by identical sequence. Starts
 * from the converting sessions (events_custom_name), joins their rows
 * through events_site_session.
 */
export const PATH_STEPS = 4;

export type PathRow = { steps: string[]; count: number };

export function pathsToQuery(
  ctx: QueryContext,
  event: string,
  limit = 10,
  w = ctx.range
): Compiled {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const n = Math.min(Math.max(limit, 1), 100);
  const sessJoin = f.hasSession
    ? " join sess s using (visitor_id, session_id)"
    : "";
  return {
    text: `with ${f.hasSession ? `${sessionCte(q, cteScope(ctx, w), f)},\n` : ""}conv as (
  select e.visitor_id, e.session_id, min(e.ts) as at
  from analytics.events e${sessJoin}
  where ${scope(q, ctx, w)} and e.event = 'custom' and e.name = ${q.p(event)} and ${f.rowWhere}${f.hasSession ? ` and ${sessionWhere(f)}` : ""}
  group by 1, 2),
prior as (
  select c.visitor_id, c.session_id, e.path,
         row_number() over (partition by c.visitor_id, c.session_id order by e.ts desc, e.seq desc, e.pageview_id desc) as rn
  from conv c join analytics.events e
    on e.site_id = ${q.p(ctx.siteId)} and e.visitor_id = c.visitor_id and e.session_id = c.session_id
  where e.event = 'pageview' and e.ts <= c.at${ctx.includeSuspect ? "" : " and not e.suspect"}),
seqs as (
  select visitor_id, session_id, array_agg(path order by rn desc) as steps
  from prior where rn <= ${PATH_STEPS}
  group by 1, 2)
select steps, count(*)::int as count
from seqs
group by 1
order by 2 desc, 1
limit ${q.p(n)}`,
    params: q.params,
  };
}
