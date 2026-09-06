import {
  type BreakdownMultiOptions,
  type MetricSpec,
  metricKey,
} from "./breakdown";
import { type Compiled, Query } from "./builder";
import {
  isEntryDimension,
  isSessionDimension,
  type RowDimension,
  rowExpr,
  type SessionDimension,
  sessionExpr,
} from "./filters";
import { type GoalDef, goalPredicate } from "./goals";
import {
  type QueryContext,
  ROW_METRICS,
  SESSION_METRICS,
  scope,
  type Window,
} from "./primitives";
import { ENTRY_COLUMN } from "./sessions";

/**
 * The daily rollup read path (D-015). analytics.rollup_daily holds one row
 * per UTC day, dimension and value with summed counts; analytics.rollup_window()
 * computes the same shape from the events for a window. An unfiltered
 * breakdown is the rolled days plus that function over the partial UTC days
 * at either end and over whatever housekeeping has not rolled yet. Anonymous
 * visitor ids rotate per UTC day, so their daily distinct counts add up;
 * identified users keep one id and are counted over the whole range from the
 * rows. Goal columns come from the goal-matching rows alone. The 'site'
 * dimension has the one value '' and is the site total the summary reads.
 */
export const ROLLUP_DIMENSIONS = [
  "site",
  "path",
  "entry_path",
  "exit_path",
  "entry_referrer",
  "entry_source",
  "entry_channel",
  "entry_utm_source",
  "entry_utm_medium",
  "entry_utm_campaign",
  "entry_utm_term",
  "entry_utm_content",
  "country",
  "region",
  "city",
  "device",
  "browser",
  "os",
] as const;

const ROLLUP_METRICS = new Set([
  "visitors",
  "revenue",
  "payments",
  "pageviews",
  "custom_events",
  "sessions",
  "bounce_rate",
  "engaged_time",
  "pages_per_session",
  "time_on_site",
  "goal_completions",
  "conversion",
]);

const DAY_MS = 86_400_000;
const ceilDay = (d: Date) => new Date(Math.ceil(d.getTime() / DAY_MS) * DAY_MS);
const floorDay = (d: Date) =>
  new Date(Math.floor(d.getTime() / DAY_MS) * DAY_MS);

/**
 * True when the rollup answers this breakdown: one rolled dimension, no
 * filters, no suspect rows, only rolled metrics, and a range that holds at
 * least one whole UTC day. Everything else takes the events scan.
 */
export function rollupApplies(
  ctx: QueryContext,
  dimension: string | [string, string],
  metrics: MetricSpec[],
  opts: BreakdownMultiOptions = {},
  w: Window = ctx.range
): boolean {
  if (Array.isArray(dimension)) return false;
  if (!(ROLLUP_DIMENSIONS as readonly string[]).includes(dimension))
    return false;
  if (ctx.filters.length || ctx.includeSuspect || opts.propKey) return false;
  const all = opts.orderBy ? [...metrics, opts.orderBy] : metrics;
  if (!all.every((m) => ROLLUP_METRICS.has(metricKey(m)))) return false;
  return ceilDay(w.from) < floorDay(w.toExclusive);
}

const SUM_COLUMNS =
  "visitors, pageviews, custom_events, sessions, bounced, engaged_ms, session_pageviews, time_on_site_ms, revenue, payments";

function metricSql(m: MetricSpec, goalAlias: (g: GoalDef) => string): string {
  const key = metricKey(m);
  switch (key) {
    case "visitors":
      return "(a.visitors + coalesce(i.visitors_ident, 0))::int";
    case "pageviews":
    case "custom_events":
    case "sessions":
    case "payments":
      return `a.${key}`;
    case "revenue":
      return "a.revenue::float8";
    case "bounce_rate":
      return "coalesce(round(100.0 * a.bounced / nullif(a.sessions, 0), 2), 0)::float8";
    case "engaged_time":
      return "coalesce(round(a.engaged_ms::numeric / nullif(a.sessions, 0)), 0)::float8";
    case "pages_per_session":
      return "coalesce(round(a.session_pageviews::numeric / nullif(a.sessions, 0), 2), 0)::float8";
    case "time_on_site":
      return "coalesce(round(a.time_on_site_ms::numeric / nullif(a.sessions, 0)), 0)::float8";
  }
  if (typeof m !== "string") {
    const g = goalAlias(m.goal);
    return m.kind === "goal_completions"
      ? `coalesce(${g}.completions, 0)::int`
      : `coalesce(round(100.0 * ${g}.converted / nullif(a.sessions, 0), 2), 0)::float8`;
  }
  throw new Error(`not a rollup metric: ${key}`);
}

export function rollupBreakdownQuery(
  ctx: QueryContext,
  dimension: string,
  metrics: MetricSpec[],
  opts: BreakdownMultiOptions = {},
  w: Window = ctx.range
): Compiled {
  if (!metrics.length) throw new Error("breakdown needs at least one metric");
  const q = new Query();
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 1000);
  const offset = Math.max(opts.offset ?? 0, 0);
  const dayStart = ceilDay(w.from);
  const dayEnd = floorDay(w.toExclusive);
  const site = q.p(ctx.siteId);
  const dim = q.p(dimension);
  const from = q.p(w.from);
  const to = q.p(w.toExclusive);
  const ds = q.p(dayStart);
  const de = q.p(dayEnd);
  const sessionDim = isSessionDimension(dimension);
  const wantVisitors = metrics.some((m) => metricKey(m) === "visitors");

  const goals: GoalDef[] = [];
  for (const m of metrics)
    if (typeof m !== "string" && !goals.some((g) => g.id === m.goal.id))
      goals.push(m.goal);
  const goalAlias = (g: GoalDef) => `g${goals.findIndex((x) => x.id === g.id)}`;

  const parts = [
    `st as (
  select coalesce((select rolled_through from analytics.rollup_state where site_id = ${site}), date '1970-01-01') as through)`,
    `b as (
  select least(${de}::timestamptz, greatest(${ds}::timestamptz, (through + 1)::timestamp at time zone 'UTC')) as tail_from from st)`,
    `u as (
  select ${SUM_COLUMNS.replace("visitors", "r.value, r.visitors")}
  from analytics.rollup_daily r, b
  where r.site_id = ${site} and r.dimension = ${dim}
    and r.day >= (${ds}::timestamptz at time zone 'UTC')::date and r.day < (b.tail_from at time zone 'UTC')::date
  union all
  select value, ${SUM_COLUMNS} from analytics.rollup_window(${site}, ${dim}, ${from}, ${ds})
  union all
  select w.value, ${SUM_COLUMNS.replace(/(\w+)/g, "w.$1")}
  from b cross join lateral analytics.rollup_window(${site}, ${dim}, b.tail_from, ${to}) w)`,
    `agg as materialized (
  select value, sum(visitors)::int as visitors, sum(pageviews)::int as pageviews,
    sum(custom_events)::int as custom_events, sum(sessions)::int as sessions, sum(bounced)::int as bounced,
    sum(engaged_ms)::bigint as engaged_ms, sum(session_pageviews)::bigint as session_pageviews,
    sum(time_on_site_ms)::bigint as time_on_site_ms, sum(revenue)::numeric as revenue, sum(payments)::int as payments
  from u group by 1)`,
  ];
  if (wantVisitors)
    parts.push(
      `ident as materialized (
  select value, visitors_ident from analytics.rollup_window(${site}, ${dim}, ${from}, ${to}, true))`
    );
  for (const g of goals) {
    const a = goalAlias(g);
    const hits = `${a}h as materialized (
  select e.visitor_id, e.session_id${sessionDim ? "" : `, ${rowExpr(dimension as RowDimension, "e")}::text as value`}
  from analytics.events e
  where ${scope(q, ctx, w)} and ${goalPredicate(q, g)})`;
    parts.push(hits);
    if (sessionDim) {
      parts.push(`${a}e as (
  select e.visitor_id, e.session_id,
    (array_agg(e.path order by e.ts, e.seq, e.pageview_id) filter (where e.event = 'pageview'))[1] as entry_path,
    (array_agg(e.path order by e.ts desc, e.seq desc, e.pageview_id desc) filter (where e.event = 'pageview'))[1] as exit_path,
    ${ENTRY_COLUMN}
  from analytics.events e
  join (select distinct visitor_id, session_id from ${a}h) k using (visitor_id, session_id)
  where ${scope(q, ctx, w)}
  group by 1, 2)`);
      parts.push(`${a} as materialized (
  select ${sessionExpr(dimension as SessionDimension, "s")}::text as value,
    count(*)::int as completions, count(distinct (h.visitor_id, h.session_id))::int as converted
  from ${a}h h join ${a}e s using (visitor_id, session_id)
  group by 1)`);
    } else {
      parts.push(`${a} as materialized (
  select value, count(*)::int as completions, count(distinct (visitor_id, session_id))::int as converted
  from ${a}h group by 1)`);
    }
  }

  const selects = metrics.map(
    (m) => `${metricSql(m, goalAlias)} as ${metricKey(m)}`
  );
  const joins = [
    wantVisitors ? "left join ident i using (value)" : "",
    ...goals.map((g) => `left join ${goalAlias(g)} using (value)`),
  ]
    .filter(Boolean)
    .join("\n");
  // '' is a real value for the entry referrer, source and channel (Direct);
  // for UTM fields and row dimensions it is the absence of one, as in the raw path
  const keepEmpty =
    dimension === "site" ||
    (sessionDim &&
      isEntryDimension(dimension) &&
      !dimension.startsWith("entry_utm_"));
  const orderKey = metricKey(opts.orderBy ?? metrics[0]);
  const dir = opts.dir === "asc" ? "asc nulls first" : "desc nulls last";
  return {
    text: `with ${parts.join(",\n")}
select a.value, ${selects.join(", ")}, count(*) over ()::int as total
from agg a
${joins}
where ${keepEmpty ? "true" : "a.value <> ''"}
order by ${orderKey} ${dir}, a.value
limit ${q.p(limit)} offset ${q.p(offset)}`,
    params: q.params,
  };
}

const SUMMARY_METRICS: MetricSpec[] = [...ROW_METRICS, ...SESSION_METRICS];

/** True when the summary for `w` can be read from the site total. */
export function rollupSummaryApplies(ctx: QueryContext, w: Window): boolean {
  return rollupApplies(ctx, "site", SUMMARY_METRICS, {}, w);
}

/** Every summary metric for `w` from the rollup: one row, or none for an empty range. */
export function rollupSummaryQuery(ctx: QueryContext, w: Window): Compiled {
  return rollupBreakdownQuery(ctx, "site", SUMMARY_METRICS, { limit: 1 }, w);
}
