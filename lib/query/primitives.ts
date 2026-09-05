import { type Compiled as CompiledQuery, Query } from "./builder";
import {
  type Compiled,
  compileFilters,
  type Filter,
  isEntryDimension,
  isRowDimension,
  isSessionDimension,
  propKey,
  type RowDimension,
  rowExpr,
  SESSION_CONSTANT,
  type SessionDimension,
  sessionExpr,
} from "./filters";
import { buckets, type Granularity } from "./ranges";
import { sessionCte, sessionWhere } from "./sessions";

/**
 * The four query primitives (design §9.2), as SQL text builders. Nothing
 * here touches a connection; run.ts executes what these return. Every query
 * starts from a site, a half-open range and, by default, `not suspect`.
 */
export type QueryContext = {
  siteId: number;
  range: { from: Date; toExclusive: Date };
  compare?: { from: Date; toExclusive: Date };
  timezone: string;
  filters: Filter[];
  includeSuspect?: boolean;
};

export const ROW_METRICS = ["pageviews", "visitors", "custom_events"] as const;
export const SESSION_METRICS = [
  "sessions",
  "bounce_rate",
  "engaged_time",
  "pages_per_session",
  "time_on_site",
] as const;
export type RowMetric = (typeof ROW_METRICS)[number];
export type SessionMetric = (typeof SESSION_METRICS)[number];
export type Metric = RowMetric | SessionMetric;

export function isSessionMetric(m: Metric): m is SessionMetric {
  return (SESSION_METRICS as readonly string[]).includes(m);
}

const ROW_METRIC_SQL: Record<RowMetric, string> = {
  pageviews: "count(*) filter (where e.event = 'pageview')::int",
  visitors: "count(distinct e.visitor_id)::int",
  custom_events: "count(*) filter (where e.event = 'custom')::int",
};

const SESSION_METRIC_SQL: Record<SessionMetric, string> = {
  sessions: "count(*)::int",
  bounce_rate:
    "coalesce(round(100.0 * count(*) filter (where s.bounced) / nullif(count(*), 0), 2), 0)::float8",
  engaged_time: "coalesce(round(avg(s.duration_ms)), 0)::float8",
  pages_per_session: "coalesce(round(avg(s.pageviews), 2), 0)::float8",
  time_on_site:
    "coalesce(round(avg(extract(epoch from s.time_on_site)) * 1000), 0)::float8",
};

type Window = { from: Date; toExclusive: Date };

function scope(q: Query, ctx: QueryContext, w: Window) {
  return `e.site_id = ${q.p(ctx.siteId)} and e.ts >= ${q.p(w.from)} and e.ts < ${q.p(w.toExclusive)}${ctx.includeSuspect ? "" : " and not e.suspect"}`;
}

function cteScope(ctx: QueryContext, w: Window) {
  return {
    siteId: ctx.siteId,
    from: w.from,
    toExclusive: w.toExclusive,
    includeSuspect: ctx.includeSuspect ?? false,
  };
}

/** FROM clause for row metrics: events, joined to sessions only when a session filter exists. */
function rowFrom(
  q: Query,
  ctx: QueryContext,
  w: Window,
  f: Compiled
): { withClause: string; from: string; where: string } {
  if (!f.hasSession) {
    return {
      withClause: "",
      from: "analytics.events e",
      where: `${scope(q, ctx, w)} and ${f.rowWhere}`,
    };
  }
  return {
    withClause: `with ${sessionCte(q, cteScope(ctx, w), f)}`,
    from: "analytics.events e join sess s using (visitor_id, session_id)",
    where: `${scope(q, ctx, w)} and ${f.rowWhere} and ${sessionWhere(f)}`,
  };
}

function bucketExpr(q: Query, col: string, g: Granularity, tz: string): string {
  return `(date_trunc(${q.p(g)}, ${col} at time zone ${q.p(tz)}) at time zone ${q.p(tz)})`;
}

// ---------------------------------------------------------------- timeseries

export type SeriesPoint = { bucket: Date; value: number };

export function timeseriesQuery(
  ctx: QueryContext,
  metric: Metric,
  granularity: Granularity,
  w: Window = ctx.range
): CompiledQuery {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  if (isSessionMetric(metric)) {
    const text = `with ${sessionCte(q, cteScope(ctx, w), f)}
select ${bucketExpr(q, "s.started", granularity, ctx.timezone)} as bucket, ${SESSION_METRIC_SQL[metric]} as value
from sess s
where ${sessionWhere(f)}
group by 1 order by 1`;
    return { text, params: q.params };
  }
  const r = rowFrom(q, ctx, w, f);
  const text = `${r.withClause}
select ${bucketExpr(q, "e.ts", granularity, ctx.timezone)} as bucket, ${ROW_METRIC_SQL[metric]} as value
from ${r.from}
where ${r.where}
group by 1 order by 1`;
  return { text, params: q.params };
}

/** Zero-fill a series over every bucket of the window. */
export function fillSeries(
  rows: { bucket: Date; value: number }[],
  w: Window,
  granularity: Granularity,
  tz: string
): SeriesPoint[] {
  const byTime = new Map(
    rows.map((r) => [new Date(r.bucket).getTime(), Number(r.value)])
  );
  return buckets(w.from, w.toExclusive, granularity, tz).map((b) => ({
    bucket: b,
    value: byTime.get(b.getTime()) ?? 0,
  }));
}

// ----------------------------------------------------------------- breakdown

export type BreakdownRow = { value: string; metric: number };
export type BreakdownOptions = {
  limit?: number;
  offset?: number;
  propKey?: string;
};

export function breakdownQuery(
  ctx: QueryContext,
  dimension: string,
  metric: Metric,
  opts: BreakdownOptions = {},
  w: Window = ctx.range
): CompiledQuery {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 1000);
  const offset = Math.max(opts.offset ?? 0, 0);
  const key = propKey(dimension);

  if (isSessionMetric(metric)) {
    if (isSessionDimension(dimension)) {
      const col = sessionExpr(dimension as SessionDimension);
      const text = `with ${sessionCte(q, cteScope(ctx, w), f, [], { entry: isEntryDimension(dimension) })}
select ${col}::text as value, ${SESSION_METRIC_SQL[metric]} as metric, count(*) over ()::int as total
from sess s
where ${sessionWhere(f)} and ${col} is not null
group by 1 order by 2 desc, 1 limit ${q.p(limit)} offset ${q.p(offset)}`;
      return { text, params: q.params };
    }
    if (isRowDimension(dimension) && SESSION_CONSTANT.includes(dimension)) {
      const text = `with ${sessionCte(q, cteScope(ctx, w), f, [{ name: "dim", expr: rowExpr(dimension, "e") }])}
select s.dim::text as value, ${SESSION_METRIC_SQL[metric]} as metric, count(*) over ()::int as total
from sess s
where ${sessionWhere(f)}
group by 1 order by 2 desc, 1 limit ${q.p(limit)} offset ${q.p(offset)}`;
      return { text, params: q.params };
    }
    throw new Error(
      `session metric ${metric} cannot be broken down by ${dimension}`
    );
  }

  if (isSessionDimension(dimension)) {
    // entry/exit page or entry attribution with a row metric: rows of sessions grouped by the session's value
    const col = sessionExpr(dimension as SessionDimension);
    const text = `with ${sessionCte(q, cteScope(ctx, w), f, [], { entry: isEntryDimension(dimension) })}
select ${col}::text as value, ${ROW_METRIC_SQL[metric]} as metric, count(*) over ()::int as total
from analytics.events e join sess s using (visitor_id, session_id)
where ${scope(q, ctx, w)} and ${f.rowWhere} and ${sessionWhere(f)} and ${col} is not null
group by 1 order by 2 desc, 1 limit ${q.p(limit)} offset ${q.p(offset)}`;
    return { text, params: q.params };
  }

  let expr: string;
  let guard = "";
  if (dimension === "prop_key") {
    expr = "k.key";
    guard = " and e.event = 'custom'";
  } else if (dimension === "prop_value") {
    if (!opts.propKey) throw new Error("prop_value needs propKey");
    expr = `(e.props ->> ${q.p(opts.propKey)})`;
    guard = ` and e.event = 'custom' and e.props ? ${q.p(opts.propKey)}`;
  } else if (key) {
    expr = `(e.props ->> ${q.p(key)})`;
    guard = ` and e.event = 'custom' and e.props ? ${q.p(key)}`;
  } else if (isRowDimension(dimension)) {
    expr = rowExpr(dimension as RowDimension, "e");
    if (dimension === "event_name") guard = " and e.event = 'custom'";
  } else {
    throw new Error(`unknown dimension ${dimension}`);
  }
  const r = rowFrom(q, ctx, w, f);
  const from =
    dimension === "prop_key"
      ? `${r.from} cross join lateral jsonb_object_keys(e.props) as k(key)`
      : r.from;
  const text = `${r.withClause}
select ${expr}::text as value, ${ROW_METRIC_SQL[metric]} as metric, count(*) over ()::int as total
from ${from}
where ${r.where}${guard} and ${expr} is not null and ${expr}::text <> ''
group by 1 order by 2 desc, 1 limit ${q.p(limit)} offset ${q.p(offset)}`;
  return { text, params: q.params };
}

// ------------------------------------------------------------------- summary

export type Summary = Record<Metric, number>;

export function summaryQueries(
  ctx: QueryContext,
  w: Window = ctx.range
): { rows: CompiledQuery; sessions: CompiledQuery } {
  const q1 = new Query();
  const f1 = compileFilters(q1, ctx.filters);
  const r = rowFrom(q1, ctx, w, f1);
  const rows = {
    text: `${r.withClause}
select ${ROW_METRICS.map((m) => `${ROW_METRIC_SQL[m]} as ${m}`).join(", ")}
from ${r.from}
where ${r.where}`,
    params: q1.params,
  };
  const q2 = new Query();
  const f2 = compileFilters(q2, ctx.filters);
  const sessions = {
    text: `with ${sessionCte(q2, cteScope(ctx, w), f2)}
select ${SESSION_METRICS.map((m) => `${SESSION_METRIC_SQL[m]} as ${m}`).join(", ")}
from sess s
where ${sessionWhere(f2)}`,
    params: q2.params,
  };
  return { rows, sessions };
}

// ---------------------------------------------------------------------- rows

export type RowsKind = "events" | "session" | "sessions";
export type RowsOptions = {
  limit?: number;
  offset?: number;
  visitorId?: bigint;
  sessionId?: bigint;
};

export function rowsQuery(
  ctx: QueryContext,
  kind: RowsKind,
  opts: RowsOptions = {},
  w: Window = ctx.range
): CompiledQuery {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  const offset = Math.max(opts.offset ?? 0, 0);
  if (kind === "events") {
    const r = rowFrom(q, ctx, w, f);
    return {
      text: `${r.withClause}
select e.id::text as id, e.ts, e.name, e.props, e.path, e.country, e.city, e.device, e.browser, e.os,
       e.visitor_id::text as visitor_id, e.session_id::text as session_id, e.revenue::float8 as revenue
from ${r.from}
where ${r.where} and e.event = 'custom'
order by e.ts desc, e.id desc limit ${q.p(limit)} offset ${q.p(offset)}`,
      params: q.params,
    };
  }
  if (kind === "session") {
    if (opts.visitorId === undefined || opts.sessionId === undefined)
      throw new Error("session rows need visitorId and sessionId");
    return {
      text: `select e.id::text as id, e.ts, e.seq, e.event, e.name, e.path, e.title, e.props, e.engaged_ms, e.scroll_depth,
       e.referrer, e.source, e.channel, e.country, e.city, e.device, e.browser, e.os
from analytics.events e
where e.site_id = ${q.p(ctx.siteId)} and e.visitor_id = ${q.p(opts.visitorId)} and e.session_id = ${q.p(opts.sessionId)}${ctx.includeSuspect ? "" : " and not e.suspect"}
order by e.ts, e.seq, e.pageview_id limit ${q.p(limit)} offset ${q.p(offset)}`,
      params: q.params,
    };
  }
  return {
    text: `with ${sessionCte(
      q,
      cteScope(ctx, w),
      f,
      [
        { name: "country", expr: "e.country" },
        { name: "device", expr: "e.device" },
        { name: "browser", expr: "e.browser" },
      ],
      { entry: true }
    )}
select s.visitor_id::text as visitor_id, s.session_id::text as session_id, s.started, s.duration_ms::int as duration_ms,
       s.pageviews, s.customs, s.entry_path, s.exit_path, s.bounced, s.country, s.device, s.browser,
       (s.entry ->> 'source') as source, (s.entry ->> 'channel') as channel
from sess s
where ${sessionWhere(f)}
order by s.started desc, s.visitor_id, s.session_id limit ${q.p(limit)} offset ${q.p(offset)}`,
    params: q.params,
  };
}
