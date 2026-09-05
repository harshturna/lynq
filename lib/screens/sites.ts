import "server-only";
import { getAllWebsites } from "@/lib/actions";
import { sql } from "@/lib/db";
import type { GoalDef } from "@/lib/query/goals";
import { siteStatus } from "@/lib/query/site-status";
import { siteStats } from "@/lib/query/sites";

/** One row of the sites list (design §8.12). Plain data for the client table. */
export type SiteRow = {
  slug: string;
  name: string;
  url: string;
  visitors: number;
  previous: number;
  spark: number[];
  /** null when the site has no KPI goal */
  kpi: number | null;
  lastAt: string | null;
  status: ReturnType<typeof siteStatus>;
};

export async function getSitesScreen(
  userId: string,
  now = new Date()
): Promise<SiteRow[]> {
  const { data: websites } = await getAllWebsites(userId);
  const list = websites ?? [];
  if (!list.length) return [];
  const ids = list.map((w) => Number(w.id));
  const goals = await sql<
    { site_id: number; id: number; kind: "pageview" | "event"; match: string }[]
  >`
    select ss.site_id::int as site_id, g.id::int as id, g.kind, g.match
    from analytics.site_settings ss join public.goals g on g.id = ss.kpi_goal_id
    where ss.site_id = any(${ids}::bigint[])`;
  const goalOf = new Map<number, GoalDef>(
    goals.map((g) => [
      Number(g.site_id),
      { id: g.id, kind: g.kind, match: g.match },
    ])
  );
  const stats = await siteStats(
    list.map((w) => ({
      siteId: Number(w.id),
      goal: goalOf.get(Number(w.id)) ?? null,
    })),
    now
  );
  return list
    .map((w) => {
      const s = stats.get(Number(w.id));
      return {
        slug: w.slug,
        name: w.name,
        url: w.url,
        visitors: s?.visitors ?? 0,
        previous: s?.previous ?? 0,
        spark: s?.spark ?? [],
        kpi: s?.kpi ?? null,
        lastAt: s?.lastAt ? s.lastAt.toISOString() : null,
        status: siteStatus(s?.lastAt ?? null, now),
      };
    })
    .sort((a, b) => b.visitors - a.visitors || a.name.localeCompare(b.name));
}
