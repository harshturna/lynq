import "server-only";
import { sql } from "@/lib/db";
import {
  createSiteResolver,
  DEFAULT_SETTINGS,
  type ResolvedSite,
  type SiteLoader,
} from "./site-resolution";

/** One query: the site for a hostname, all of its hostnames, its settings or the defaults. */
export const loadSiteFromDatabase: SiteLoader = async (hostname) => {
  const rows = await sql<
    {
      site_id: string;
      hostnames: string[];
      timezone: string | null;
      store_titles: boolean | null;
      store_user_ids: boolean | null;
      excluded_ips: string[] | null;
      excluded_paths: string[] | null;
    }[]
  >`
    select h.site_id,
           (select array_agg(hostname) from analytics.site_hostnames where site_id = h.site_id) as hostnames,
           s.timezone, s.store_titles, s.store_user_ids, s.excluded_ips, s.excluded_paths
    from analytics.site_hostnames h
    join public.websites w on w.id = h.site_id and w.deleted_at is null
    left join analytics.site_settings s on s.site_id = h.site_id
    where h.hostname = ${hostname}`;
  const row = rows[0];
  if (!row) return null;
  const site: ResolvedSite = {
    siteId: Number(row.site_id),
    hostnames: row.hostnames ?? [hostname],
    settings: {
      timezone: row.timezone ?? DEFAULT_SETTINGS.timezone,
      store_titles: row.store_titles ?? DEFAULT_SETTINGS.store_titles,
      store_user_ids: row.store_user_ids ?? DEFAULT_SETTINGS.store_user_ids,
      excluded_ips: row.excluded_ips ?? [],
      excluded_paths: row.excluded_paths ?? [],
    },
  };
  return site;
};

export const resolveSite = createSiteResolver(loadSiteFromDatabase);
