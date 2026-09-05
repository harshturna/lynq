import "server-only";
import { sql } from "@/lib/db";
import type { Site } from "@/lib/query/authorize";
/**
 * Settings (design §8.10): everything the one page shows, read in a few
 * cheap queries. Most sites have no settings row; the defaults stand in.
 */
import type { Diagnostic } from "./diagnostics";
import { listGoals } from "./goals";
import type { KpiGoal } from "./kpi";

export type { Diagnostic };

export type SettingsData = {
  name: string;
  url: string;
  hostnames: string[];
  timezone: string;
  shortcuts: boolean;
  storeTitles: boolean;
  storeUserIds: boolean;
  excludedIps: string[];
  excludedPaths: string[];
  kpiGoalId: number | null;
  goals: KpiGoal[];
  retentionMonths: number;
  breakpoints: number[];
  lastAt: string | null;
  diagnostics: Diagnostic[];
};

export const DIAGNOSTICS_HOURS = 24;

/** Rejections for a site's hostnames over the trailing window, grouped by stage and host. */
export async function readDiagnostics(
  siteId: number,
  hosts: string[],
  minutes: number
): Promise<Diagnostic[]> {
  if (!hosts.length) return [];
  const rows = await sql<
    {
      stage: string;
      hostname: string;
      n: number;
      last_at: Date;
      detail: string;
    }[]
  >`
    select stage, hostname, count(*)::int as n, max(ts) as last_at,
           (array_agg(detail order by ts desc))[1] as detail
    from analytics.ingest_log
    where (site_id = ${siteId} or hostname = any(${hosts}::text[]))
      and ts >= now() - make_interval(mins => ${minutes})
    group by 1, 2 order by n desc, last_at desc limit 12`;
  return rows.map((d) => ({
    stage: d.stage,
    hostname: d.hostname,
    count: Number(d.n),
    lastAt: new Date(d.last_at).toISOString(),
    detail: d.detail,
  }));
}

export async function getSettings(
  site: Site,
  website: { name: string; url: string }
): Promise<SettingsData> {
  const [settings, hostnames, goals, last] = await Promise.all([
    sql<
      {
        timezone: string;
        store_titles: boolean;
        store_user_ids: boolean;
        excluded_ips: string[];
        excluded_paths: string[];
        retention_months: number;
      }[]
    >`
      select timezone, store_titles, store_user_ids, excluded_ips::text[] as excluded_ips,
             excluded_paths, retention_months
      from analytics.site_settings where site_id = ${site.siteId}`,
    sql<{ hostname: string }[]>`
      select hostname from analytics.site_hostnames where site_id = ${site.siteId} order by hostname`,
    listGoals(site.siteId),
    sql<{ last_at: Date | null }[]>`
      select max(received_at) as last_at from analytics.events where site_id = ${site.siteId}`,
  ]);
  const hosts = hostnames.map((h) => h.hostname);
  const diagnostics = await readDiagnostics(
    site.siteId,
    hosts,
    DIAGNOSTICS_HOURS * 60
  );
  const s = settings[0];
  return {
    name: website.name,
    url: website.url,
    hostnames: hosts,
    timezone: s?.timezone ?? site.timezone,
    shortcuts: site.shortcuts,
    storeTitles: s?.store_titles ?? false,
    storeUserIds: s?.store_user_ids ?? false,
    excludedIps: s?.excluded_ips ?? [],
    excludedPaths: s?.excluded_paths ?? [],
    kpiGoalId: site.kpiGoalId,
    goals,
    retentionMonths: Number(s?.retention_months ?? 24),
    breakpoints: site.breakpoints,
    lastAt: last[0]?.last_at ? new Date(last[0].last_at).toISOString() : null,
    diagnostics,
  };
}
