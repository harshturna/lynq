import { type Compiled, Query } from "./builder";
import {
  compileFilters,
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
import { type GoalDef, goalPredicate } from "./goals";
import {
  cteScope,
  isSessionMetric,
  type Metric,
  type QueryContext,
  ROW_METRICS,
  SESSION_METRICS,
  scope,
} from "./primitives";
import { sessionCte, sessionWhere } from "./sessions";

/**
 * The multi-metric breakdown (design §9.2, §9.3): several metrics per value in
 * one statement, optionally over two dimensions. Row metrics and session
 * metrics are grouped in separate CTEs and joined on the value, never one
 * GROUP BY over the joined rows, which would count sessions as event rows.
 */
export type MetricSpec =
  | Metric
  | "revenue"
  | "payments"
  | "last_seen"
  | { kind: "goal_completions" | "conversion"; goal: GoalDef };

export type BreakdownMultiOptions = {
  limit?: number;
  offset?: number;
  propKey?: string;
  orderBy?: MetricSpec;
  dir?: "asc" | "desc";
};

export type BreakdownMultiRow = {
  value: string;
  value2?: string;
  total: number;
} & Record<string, number | string | null>;

export function metricKey(m: MetricSpec): string {
  return typeof m === "string" ? m : m.kind;
}

const ROW_SIDE = new Set<string>([
  ...ROW_METRICS,
  "revenue",
  "payments",
  "last_seen",
  "goal_completions",
]);
const SESSION_SIDE = new Set<string>([...SESSION_METRICS, "conversion"]);

function rowMetricSql(q: Query, m: MetricSpec): string {
  if (typeof m === "string") {
    switch (m) {
      case "pageviews":
        return "count(*) filter (where e.event = 'pageview')::int";
      case "visitors":
        return "count(distinct e.visitor_id)::int";
      case "custom_events":
        return "count(*) filter (where e.event = 'custom')::int";
      case "revenue":
        return "coalesce(sum(e.revenue), 0)::float8";
      case "payments":
        return "count(*) filter (where e.revenue is not null)::int";
      case "last_seen":
        return "max(e.ts)";
    }
  } else if (m.kind === "goal_completions") {
    return `count(*) filter (where ${goalPredicate(q, m.goal)})::int`;
  }
  throw new Error(`not a row metric: ${metricKey(m)}`);
}

function sessionMetricSql(m: MetricSpec): string {
  switch (metricKey(m)) {
    case "sessions":
      return "count(*)::int";
    case "bounce_rate":
      return "coalesce(round(100.0 * count(*) filter (where bounced) / nullif(count(*), 0), 2), 0)::float8";
    case "engaged_time":
      return "coalesce(round(avg(duration_ms)), 0)::float8";
    case "pages_per_session":
      return "coalesce(round(avg(pv), 2), 0)::float8";
    case "time_on_site":
      return "coalesce(round(avg(extract(epoch from time_on_site)) * 1000), 0)::float8";
    case "conversion":
      return "coalesce(round(100.0 * count(*) filter (where converted) / nullif(count(*), 0), 2), 0)::float8";
  }
  throw new Error(`not a session metric: ${metricKey(m)}`);
}

type Dim = { expr: string; guard: string; session: boolean; constant: boolean };

/** One dimension's SQL on the events alias `e` (or the session alias `s`). */
function resolveDim(
  q: Query,
  dimension: string,
  opts: BreakdownMultiOptions
): Dim {
  const key = propKey(dimension);
  if (dimension === "prop_value") {
    if (!opts.propKey) throw new Error("prop_value needs propKey");
    return {
      expr: `(e.props ->> ${q.p(opts.propKey)})`,
      guard: ` and e.event = 'custom' and e.props ? ${q.p(opts.propKey)}`,
      session: false,
      constant: false,
    };
  }
  if (key)
    return {
      expr: `(e.props ->> ${q.p(key)})`,
      guard: ` and e.event = 'custom' and e.props ? ${q.p(key)}`,
      session: false,
      constant: false,
    };
  if (isSessionDimension(dimension))
    return {
      expr: sessionExpr(dimension as SessionDimension),
      guard: "",
      session: true,
      constant: true,
    };
  if (isRowDimension(dimension))
    return {
      expr: rowExpr(dimension as RowDimension, "e"),
      guard: dimension === "event_name" ? " and e.event = 'custom'" : "",
      session: false,
      constant: SESSION_CONSTANT.includes(dimension as RowDimension),
    };
  throw new Error(`unknown dimension ${dimension}`);
}

export function breakdownMultiQuery(
  ctx: QueryContext,
  dimension: string | [string, string],
  metrics: MetricSpec[],
  opts: BreakdownMultiOptions = {},
  w = ctx.range
): Compiled {
  if (!metrics.length) throw new Error("breakdown needs at least one metric");
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 1000);
  const offset = Math.max(opts.offset ?? 0, 0);
  const dims = (Array.isArray(dimension) ? dimension : [dimension]).map((d) =>
    resolveDim(q, d, opts)
  );
  if (dims.length === 2 && dims.some((d) => d.session))
    throw new Error("two-dimension breakdown takes row dimensions");
  const rowMetrics = metrics.filter((m) => ROW_SIDE.has(metricKey(m)));
  const sessMetrics = metrics.filter((m) => SESSION_SIDE.has(metricKey(m)));
  const hasGoal = metrics.some((m) => typeof m !== "string");
  const anySession = dims.some((d) => d.session);
  const needsEntry = dims.some(
    (d, i) =>
      d.session &&
      isEntryDimension((Array.isArray(dimension) ? dimension : [dimension])[i])
  );
  const needSess = sessMetrics.length > 0 || f.hasSession || anySession;
  const keys = dims.length === 2 ? "value, value2" : "value";
  const dimCols = dims
    .map((d, i) => `${d.expr}::text as ${i === 0 ? "value" : "value2"}`)
    .join(", ");
  const guard = dims.map((d) => d.guard).join("");
  const nonEmpty = dims
    .map((d, i) => {
      // '' is a real entry value (Direct); for row dimensions it is noise
      const raw = Array.isArray(dimension) ? dimension[i] : dimension;
      return d.session && isEntryDimension(raw)
        ? ` and ${d.expr} is not null`
        : ` and ${d.expr} is not null and ${d.expr}::text <> ''`;
    })
    .join("");
  const from = needSess
    ? "analytics.events e join sess s using (visitor_id, session_id)"
    : "analytics.events e";
  // Parameters are numbered by push order and every one must appear in the
  // text, so the row scope is only compiled when a CTE reads the rows.
  let rowWhere: string | null = null;
  const where = () => {
    rowWhere ??= `${scope(q, ctx, w)} and ${f.rowWhere}${needSess ? ` and ${sessionWhere(f)}` : ""}${guard}${nonEmpty}`;
    return rowWhere;
  };
  const withParts: string[] = [];
  if (needSess)
    withParts.push(
      sessionCte(q, cteScope(ctx, w), f, [], { entry: needsEntry })
    );

  const selects: string[] = [];
  if (rowMetrics.length) {
    withParts.push(`rowm as (
  select ${dimCols}, ${rowMetrics.map((m) => `${rowMetricSql(q, m)} as ${metricKey(m)}`).join(", ")}
  from ${from}
  where ${where()}
  group by ${dims.length === 2 ? "1, 2" : "1"})`);
    selects.push(...rowMetrics.map((m) => `r.${metricKey(m)}`));
  }
  if (sessMetrics.length) {
    const goalPred = hasGoal
      ? metrics.find((m) => typeof m !== "string" && m.kind === "conversion")
      : undefined;
    const converted =
      goalPred && typeof goalPred !== "string"
        ? `bool_or(${goalPredicate(q, goalPred.goal)})`
        : "false";
    // one row per (value, session): from sess alone when the dimension is
    // session-constant and no goal predicate needs the rows
    const fromSess = dims.every((d) => d.session) && !hasGoal;
    withParts.push(
      fromSess
        ? `pairs as (
  select ${dimCols}, s.visitor_id, s.session_id, s.bounced, s.duration_ms, s.pageviews as pv, s.time_on_site, false as converted
  from sess s
  where ${sessionWhere(f)}${nonEmpty})`
        : `pairs as (
  select ${dimCols}, s.visitor_id, s.session_id, s.bounced, s.duration_ms, s.pageviews as pv, s.time_on_site, ${converted} as converted
  from ${from}
  where ${where()}
  group by ${dims.length === 2 ? "1, 2, 3, 4, 5, 6, 7, 8" : "1, 2, 3, 4, 5, 6, 7"})`
    );
    withParts.push(`sessm as (
  select ${keys}, ${sessMetrics.map((m) => `${sessionMetricSql(m)} as ${metricKey(m)}`).join(", ")}
  from pairs group by ${dims.length === 2 ? "1, 2" : "1"})`);
    selects.push(...sessMetrics.map((m) => `m.${metricKey(m)}`));
  }
  const orderKey = metricKey(opts.orderBy ?? metrics[0]);
  const orderAlias = ROW_SIDE.has(orderKey) ? `r.${orderKey}` : `m.${orderKey}`;
  const dir = opts.dir === "asc" ? "asc nulls first" : "desc nulls last";
  const both = rowMetrics.length && sessMetrics.length;
  const fromClause = both
    ? `rowm r full join sessm m using (${keys})`
    : rowMetrics.length
      ? "rowm r"
      : "sessm m";
  const valueCols = dims.length === 2 ? "value, value2" : "value";
  return {
    text: `with ${withParts.join(",\n")}
select ${valueCols}, ${selects.join(", ")}, count(*) over ()::int as total
from ${fromClause}
order by ${orderAlias} ${dir}, ${valueCols}
limit ${q.p(limit)} offset ${q.p(offset)}`,
    params: q.params,
  };
}

export { isSessionMetric };
