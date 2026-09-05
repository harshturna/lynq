import "server-only";
import { sql, withTimeout } from "@/lib/db";
import type { Site } from "@/lib/query/authorize";
import type { GoalDef } from "@/lib/query/goals";
import type { QueryContext } from "@/lib/query/primitives";

/**
 * The KPI in its three states (design §8.0): the goal marked in settings, and
 * whether any event in the range carries revenue. One cheap probe per screen.
 */
export type KpiGoal = GoalDef & {
  name: string;
  revenue: boolean;
  target: number | null;
};

export type Kpi = { goal: KpiGoal | null; hasRevenue: boolean };

export async function getGoal(
  siteId: number,
  goalId: number
): Promise<KpiGoal | null> {
  const [row] = await sql<
    {
      id: number;
      name: string;
      kind: "pageview" | "event";
      match: string;
      revenue: boolean;
      target: number | null;
    }[]
  >`
    select id, name, kind, match, revenue, target
    from public.goals where site_id = ${siteId} and id = ${goalId}`;
  return row
    ? {
        id: Number(row.id),
        name: row.name,
        kind: row.kind,
        match: row.match,
        revenue: row.revenue,
        target: row.target === null ? null : Number(row.target),
      }
    : null;
}

export async function loadKpi(site: Site, ctx: QueryContext): Promise<Kpi> {
  const [goal, revenue] = await Promise.all([
    site.kpiGoalId === null ? null : getGoal(site.siteId, site.kpiGoalId),
    withTimeout(
      ctx.timeoutMs ?? 1_500,
      (tx) => tx<{ has: boolean }[]>`
        select exists(
          select 1 from analytics.events
          where site_id = ${ctx.siteId} and ts >= ${ctx.range.from} and ts < ${ctx.range.toExclusive}
            and revenue is not null) as has`
    ),
  ]);
  return { goal, hasRevenue: revenue[0]?.has === true };
}
