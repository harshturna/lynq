import { type Compiled, Query } from "./builder";
import { compileFilters } from "./filters";
import { cteScope, type QueryContext, scope } from "./primitives";
import { sessionCte, sessionWhere } from "./sessions";

/**
 * Page flow (design §9.5): what the sessions that touched a page did just
 * before and just after it, with loops collapsed (a reload or a repeated
 * page is one step). Bounded by the sessions CTE, which the added `path is`
 * filter restricts to sessions that touched the page.
 */
export type FlowRow = {
  side: "from" | "to";
  /** page: another path; referrer: the session started here, value is the entry referrer; exit: left the site */
  kind: "page" | "referrer" | "exit";
  value: string;
  count: number;
};

export function pageFlowQuery(
  ctx: QueryContext,
  path: string,
  w = ctx.range
): Compiled {
  const q = new Query();
  const f = compileFilters(q, [
    ...ctx.filters,
    { dimension: "path", op: "is" as const, values: [path] },
  ]);
  const p = q.p(path);
  const win =
    "partition by visitor_id, session_id order by ts, seq, pageview_id";
  return {
    text: `with ${sessionCte(q, cteScope(ctx, w), f, [], { entry: true })},
steps as (
  select e.visitor_id, e.session_id, e.path, e.ts, e.seq, e.pageview_id,
         lag(e.path) over (${win}) as prev
  from analytics.events e join sess s using (visitor_id, session_id)
  where ${scope(q, ctx, w)} and e.event = 'pageview' and ${sessionWhere(f)}),
collapsed as (
  select visitor_id, session_id, path,
         lag(path) over (${win}) as prev, lead(path) over (${win}) as next
  from steps where prev is distinct from path),
hits as (
  select c.*, (s.entry ->> 'referrer') as entry_referrer
  from collapsed c join sess s using (visitor_id, session_id)
  where c.path = ${p})
select side, kind, value, count(*)::int as count from (
  select 'from' as side,
         case when prev is null then 'referrer' else 'page' end as kind,
         case when prev is null then coalesce(entry_referrer, '') else prev end as value
  from hits
  union all
  select 'to', case when next is null then 'exit' else 'page' end, coalesce(next, '') from hits
) x
group by 1, 2, 3
order by 1, 4 desc, 3
limit 60`,
    params: q.params,
  };
}
