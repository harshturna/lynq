import { type Compiled, Query } from "./builder";
import { compileFilters } from "./filters";
import type { QueryContext } from "./primitives";
import { sessionCte, sessionWhere } from "./sessions";

/**
 * Realtime (design §9.4): one row of jsonb aggregates over a single
 * materialised CTE of the last 30 minutes by received_at, served by
 * events_site_received. The session CTE is built over the same window so
 * session chips compose.
 */
export const REALTIME_WINDOW_MIN = 30;
export const REALTIME_NOW_MIN = 5;

export type RealtimeRow = {
  visitors_now: number;
  per_minute: { minute: string; pageviews: number }[];
  pages: { value: string; visitors: number }[];
  sources: { value: string; sessions: number }[];
  countries: { value: string; visitors: number }[];
  events: {
    ts: string;
    event: string;
    name: string;
    path: string;
    country: string;
    visitor_id: string;
    session_id: string;
  }[];
};

export function realtimeQuery(ctx: QueryContext, now = new Date()): Compiled {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const from = new Date(now.getTime() - REALTIME_WINDOW_MIN * 60_000);
  const toExclusive = new Date(now.getTime() + 60_000);
  const nowFrom = new Date(now.getTime() - REALTIME_NOW_MIN * 60_000);
  const sc = {
    siteId: ctx.siteId,
    from,
    toExclusive,
    includeSuspect: ctx.includeSuspect ?? false,
    column: "received_at" as const,
  };
  const sessJoin = f.hasSession
    ? ` join sess s using (visitor_id, session_id)`
    : "";
  const agg = (obj: string, order: string, inner: string) =>
    `(select coalesce(jsonb_agg(${obj} order by ${order}), '[]'::jsonb) from (${inner}) x)`;
  return {
    text: `with ${f.hasSession ? `${sessionCte(q, sc, f)},\n` : ""}recent as materialized (
  select e.* from analytics.events e${sessJoin}
  where e.site_id = ${q.p(ctx.siteId)} and e.received_at >= ${q.p(from)} and e.received_at < ${q.p(toExclusive)}
    ${ctx.includeSuspect ? "" : "and not e.suspect"} and ${f.rowWhere}${f.hasSession ? ` and ${sessionWhere(f)}` : ""})
select
  (select count(distinct visitor_id)::int from recent where event = 'pageview' and received_at >= ${q.p(nowFrom)}) as visitors_now,
  ${agg("jsonb_build_object('minute', m, 'pageviews', c)", "m", "select date_trunc('minute', received_at) as m, count(*) filter (where event = 'pageview')::int as c from recent group by 1")} as per_minute,
  ${agg("jsonb_build_object('value', path, 'visitors', n)", "n desc, path", "select path, count(distinct visitor_id)::int as n from recent where event = 'pageview' group by 1 order by 2 desc, 1 limit 10")} as pages,
  ${agg("jsonb_build_object('value', source, 'sessions', n)", "n desc, source", "select source, count(*)::int as n from (select distinct on (visitor_id, session_id) source from recent where event = 'pageview' order by visitor_id, session_id, ts, seq, pageview_id) first group by 1 order by 2 desc, 1 limit 10")} as sources,
  ${agg("jsonb_build_object('value', country, 'visitors', n)", "n desc, country", "select country, count(distinct visitor_id)::int as n from recent where event = 'pageview' group by 1 order by 2 desc, 1 limit 10")} as countries,
  ${agg("jsonb_build_object('ts', ts, 'event', event, 'name', name, 'path', path, 'country', country, 'visitor_id', visitor_id::text, 'session_id', session_id::text)", "ts desc", "select * from recent where event in ('pageview', 'custom') order by ts desc, seq desc limit 50")} as events`,
    params: q.params,
  };
}

/** Zero-fill the per-minute series over the window, oldest first. */
export function fillMinutes(
  rows: { minute: string; pageviews: number }[],
  now = new Date()
): { minute: string; pageviews: number }[] {
  const by = new Map(
    rows.map((r) => [new Date(r.minute).getTime(), Number(r.pageviews)])
  );
  const end = Math.floor(now.getTime() / 60_000) * 60_000;
  const out: { minute: string; pageviews: number }[] = [];
  for (let i = REALTIME_WINDOW_MIN - 1; i >= 0; i--) {
    const t = end - i * 60_000;
    out.push({ minute: new Date(t).toISOString(), pageviews: by.get(t) ?? 0 });
  }
  return out;
}
