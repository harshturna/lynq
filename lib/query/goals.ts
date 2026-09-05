import { globToLike } from "@/lib/ingest/glob";
import { type Compiled, Query } from "./builder";
import { compileFilters } from "./filters";
import type { QueryContext } from "./primitives";
import { bucketExpr, cteScope, rowFrom, scope } from "./primitives";
import type { Granularity } from "./ranges";
import { sessionCte, sessionWhere } from "./sessions";

/**
 * Goals and funnels (design §9.6). A goal is a path glob or an event name;
 * the builders take the definition, not an id, because they emit SQL text
 * and cannot look anything up.
 */
export type GoalDef = {
  id: number;
  kind: "pageview" | "event";
  match: string;
};

/** A funnel step: every session, a path glob, or an event name. */
export type FunnelStep =
  | { kind: "any" }
  | { kind: "pageview"; match: string }
  | { kind: "event"; match: string };

/** The predicate for a goal or step on the events alias `e`. */
export function goalPredicate(
  q: Query,
  goal: { kind: "pageview" | "event"; match: string }
): string {
  return goal.kind === "pageview"
    ? `(e.event = 'pageview' and e.path like ${q.p(globToLike(goal.match))} escape '\\')`
    : `(e.event = 'custom' and e.name = ${q.p(goal.match)})`;
}

export type GoalStats = {
  completions: number;
  converting_sessions: number;
  sessions: number;
  /** completions / sessions × 100 style rate: converting sessions per hundred sessions */
  conversion: number;
  revenue: number;
  /** median seconds from session start to the first completion; null with no completions */
  median_seconds: number | null;
};

export function goalStatsQuery(
  ctx: QueryContext,
  goal: GoalDef,
  w = ctx.range
): Compiled {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const pred = goalPredicate(q, goal);
  return {
    text: `with ${sessionCte(q, cteScope(ctx, w), f)},
hits as (
  select s.visitor_id, s.session_id, s.started,
         count(*) filter (where ${pred})::int as completions,
         coalesce(sum(e.revenue) filter (where ${pred}), 0)::float8 as revenue,
         min(e.ts) filter (where ${pred}) as first_at
  from analytics.events e join sess s using (visitor_id, session_id)
  where ${scope(q, ctx, w)} and ${sessionWhere(f)}
  group by 1, 2, 3)
select coalesce(sum(completions), 0)::int as completions,
       count(*) filter (where completions > 0)::int as converting_sessions,
       count(*)::int as sessions,
       coalesce(sum(revenue), 0)::float8 as revenue,
       (percentile_cont(0.5) within group (order by extract(epoch from (first_at - started)))
          filter (where completions > 0))::float8 as median_seconds
from hits`,
    params: q.params,
  };
}

/** A sortable key for "which came first": milliseconds of ts, then seq. */
const ORDER_KEY =
  "((extract(epoch from e.ts) * 1000)::bigint * 100000 + least(e.seq, 99999))";

export const MAX_FUNNEL_STEPS = 8;

/**
 * Sessions reaching each step in order: a session counts for step n when it
 * reached step n-1 and its first hit of step n is not before its first hit of
 * step n-1. One aggregate per step per session, no self-join.
 */
export function funnelQuery(
  ctx: QueryContext,
  steps: FunnelStep[],
  w = ctx.range
): Compiled {
  if (steps.length < 1 || steps.length > MAX_FUNNEL_STEPS)
    throw new Error(`a funnel has 1 to ${MAX_FUNNEL_STEPS} steps`);
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const cols = steps.map((s, i) =>
    s.kind === "any"
      ? `min(${ORDER_KEY}) as t${i}`
      : `min(${ORDER_KEY}) filter (where ${goalPredicate(q, s)}) as t${i}`
  );
  const counts = steps.map((_, i) => {
    const reached = [`t0 is not null`];
    for (let j = 1; j <= i; j++)
      reached.push(`t${j} is not null and t${j} >= t${j - 1}`);
    return `count(*) filter (where ${reached.join(" and ")})::int as s${i}`;
  });
  return {
    text: `with ${sessionCte(q, cteScope(ctx, w), f)},
per as (
  select s.visitor_id, s.session_id, ${cols.join(", ")}
  from analytics.events e join sess s using (visitor_id, session_id)
  where ${scope(q, ctx, w)} and ${sessionWhere(f)}
  group by 1, 2)
select ${counts.join(", ")} from per`,
    params: q.params,
  };
}

/** Completions per bucket, for the KPI tile's lead chart (design §8.1). */
export function goalTimeseriesQuery(
  ctx: QueryContext,
  goal: GoalDef,
  granularity: Granularity,
  w = ctx.range
): Compiled {
  const q = new Query();
  const f = compileFilters(q, ctx.filters);
  const r = rowFrom(q, ctx, w, f);
  return {
    text: `${r.withClause}
select ${bucketExpr(q, "e.ts", granularity, ctx.timezone)} as bucket, count(*)::int as value
from ${r.from}
where ${r.where} and ${goalPredicate(q, goal)}
group by 1 order by 1`,
    params: q.params,
  };
}
