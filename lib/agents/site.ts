import "server-only";
import type { ResolvedKey } from "@/lib/api-keys";
import { sql } from "@/lib/db";
import type { Site } from "@/lib/query/authorize";
import { listGoals } from "@/lib/screens/goals";
import type { KpiGoal } from "@/lib/screens/kpi";

/**
 * A key to the site it names (docs/design/agents-mcp-and-cli.md §2): the
 * same `Site` `authorize()` builds for a session, read from the key's
 * site_id rather than a Supabase user, plus what an agent needs to describe
 * the site to itself. D-017 is the authorisation: a key exists only for its
 * own site, so there is nothing further to check.
 */
export type AgentSite = Site & {
  url: string;
  name: string;
  hostnames: string[];
  goals: KpiGoal[];
};

export async function siteForKey(key: ResolvedKey): Promise<AgentSite | null> {
  const [[website], [settings], hostnames, goals] = await Promise.all([
    sql<{ url: string; name: string }[]>`
      select url, name from public.websites where id = ${key.siteId} and deleted_at is null`,
    sql<
      {
        timezone: string;
        kpi_goal_id: number | null;
        breakpoints: number[];
        shortcuts: boolean;
      }[]
    >`
      select timezone, kpi_goal_id, breakpoints, shortcuts
      from analytics.site_settings where site_id = ${key.siteId}`,
    sql<{ hostname: string }[]>`
      select hostname from analytics.site_hostnames where site_id = ${key.siteId} order by hostname`,
    listGoals(key.siteId),
  ]);
  if (!website) return null;
  return {
    siteId: key.siteId,
    timezone: settings?.timezone ?? "UTC",
    kpiGoalId:
      settings?.kpi_goal_id === null || settings?.kpi_goal_id === undefined
        ? null
        : Number(settings.kpi_goal_id),
    breakpoints: settings?.breakpoints?.map(Number) ?? [640, 1024, 1280],
    shortcuts: settings?.shortcuts ?? true,
    bots: false,
    url: website.url,
    name: website.name,
    hostnames: hostnames.map((h) => h.hostname),
    goals,
  };
}
