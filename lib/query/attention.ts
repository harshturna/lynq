import { type Compiled, Query } from "./builder";
import { compileFilters } from "./filters";
import { type GoalDef, goalPredicate } from "./goals";
import { cteScope, type QueryContext, rowFrom, scope } from "./primitives";
import { sessionWhere } from "./sessions";

/**
 * Attention, read-through and influence (D-016, docs/design/attention-and-influence.md):
 * a second reading of rows already stored, so the Pages screen can rank by how
 * much time a page holds rather than how often it was opened.
 *
 * Engaged time and scroll depth arrive on `engagement` events, not on the
 * pageview row, and those events carry the page's `path` and `pageview_id`,
 * so both metrics group engagement rows by pageview and then by path.
 */
export const READ_THROUGH_SCROLL = 75;
export const READ_THROUGH_MS = 10_000;
/** Below this many pageviews a share of them is noise, so it is not shown. */
export const READ_THROUGH_MIN_PAGEVIEWS = 30;
/** Influence needs this many sessions on each side of the comparison. */
export const INFLUENCE_MIN_SESSIONS = 50;

export type AttentionRow = {
  value: string;
  /** Engaged milliseconds the page accumulated in the range. */
  attention_ms: number;
  /** Pageviews that reported engagement; the read-through denominator. */
  pageviews: number;
  /** Null under the minimum, never zero-as-unknown. */
  read_through: number | null;
  /** The site's attention in the range, so the caller can compute a share. */
  site_attention_ms: number;
  total: number;
};

export function attentionQuery(
  ctx: QueryContext,
  opts: { limit?: number } = {},
  w = ctx.range
): Compiled {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 1000);
  const r = rowFrom(q, ctx, w, f);
  return {
    text: `${r.withClause ? `${r.withClause},` : "with"} pv as (
  select e.path, e.pageview_id,
    sum(e.engaged_ms)::bigint as engaged,
    max(e.scroll_depth)::int as scroll
  from ${r.from}
  where ${r.where} and e.event = 'engagement'
  group by 1, 2)
select path as value,
  sum(engaged)::bigint as attention_ms,
  count(*)::int as pageviews,
  case when count(*) >= ${READ_THROUGH_MIN_PAGEVIEWS}
    then round(100.0 * count(*) filter (
      where scroll >= ${READ_THROUGH_SCROLL} and engaged >= ${READ_THROUGH_MS}) / count(*), 1)
    else null end::float8 as read_through,
  sum(sum(engaged)) over ()::bigint as site_attention_ms,
  count(*) over ()::int as total
from pv
where path <> ''
group by 1
order by attention_ms desc, path
limit ${q.p(limit)}`,
    params: q.params,
  };
}

export type InfluenceRow = {
  value: string;
  /** Sessions that saw the page before converting, or that never converted. */
  sessions: number;
  conversion: number;
  /** The rate among every other session in the range. */
  conversion_without: number;
  /** conversion / conversion_without; null when either side is too small. */
  lift: number | null;
};

/**
 * A page counts only when it was seen *before* the session's first completion
 * (D-016). Without that rule the ranking is led by pages people reach *by*
 * converting: on the seeded site the naive form puts /dashboard first at
 * 3.16x, and this form drops it from the list entirely.
 */
export function influenceQuery(
  ctx: QueryContext,
  goal: GoalDef,
  opts: { limit?: number } = {},
  w = ctx.range
): Compiled {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 1000);
  const pred = goalPredicate(q, goal);
  const s = cteScope(ctx, w);
  return {
    text: `with sess as materialized (
  select e.visitor_id, e.session_id,
    bool_or(${pred}) as converted,
    min(e.ts) filter (where ${pred}) as converted_at
  from analytics.events e
  where e.site_id = ${q.p(s.siteId)}
    and e.ts >= ${q.p(s.from)} and e.ts < ${q.p(s.toExclusive)}
    ${s.includeSuspect ? "" : "and not e.suspect"}
  group by 1, 2
  having bool_or(${f.rowWhere})),
totals as (
  select count(*)::int as n, count(*) filter (where converted)::int as c
  from sess s where ${sessionWhere(f)}),
seen as (
  -- the converted flag is carried here rather than joined back afterwards:
  -- a CTE has no index, so the second join was a nested loop rescanning every
  -- session per row and cost seconds (TICKET-080).
  select distinct e.path, e.visitor_id, e.session_id, s.converted
  from analytics.events e join sess s using (visitor_id, session_id)
  where ${scope(q, ctx, w)} and e.event = 'pageview' and ${sessionWhere(f)}
    and (s.converted_at is null or e.ts < s.converted_at)),
per as (
  select path,
    count(*)::int as sessions,
    count(*) filter (where converted)::int as converted
  from seen
  group by 1)
select per.path as value, per.sessions,
  round(100.0 * per.converted / nullif(per.sessions, 0), 2)::float8 as conversion,
  round(100.0 * (t.c - per.converted) / nullif(t.n - per.sessions, 0), 2)::float8 as conversion_without,
  case when per.sessions >= ${INFLUENCE_MIN_SESSIONS}
        and t.n - per.sessions >= ${INFLUENCE_MIN_SESSIONS}
        and (t.c - per.converted) > 0
    then round((1.0 * per.converted / per.sessions) /
      (1.0 * (t.c - per.converted) / (t.n - per.sessions)), 2)
    else null end::float8 as lift
from per, totals t
where per.path <> ''
order by lift desc nulls last, per.sessions desc
limit ${q.p(limit)}`,
    params: q.params,
  };
}
