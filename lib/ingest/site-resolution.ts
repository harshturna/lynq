/**
 * Origin hostname to a site and its settings (design §7.3), cached per
 * function instance for 60 s, hits and misses alike. Kept free of database
 * imports so the cache is unit-testable; lib/ingest/sites.ts wires the query.
 */
export type SiteSettings = {
  timezone: string;
  store_titles: boolean;
  store_user_ids: boolean;
  excluded_ips: string[];
  excluded_paths: string[];
};

export type ResolvedSite = {
  siteId: number;
  hostnames: string[];
  settings: SiteSettings;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  timezone: "UTC",
  store_titles: false,
  store_user_ids: false,
  excluded_ips: [],
  excluded_paths: [],
};

export type SiteLoader = (hostname: string) => Promise<ResolvedSite | null>;

export function createSiteResolver(
  load: SiteLoader,
  ttlMs = 60_000,
  now = () => Date.now()
) {
  const cache = new Map<
    string,
    { value: ResolvedSite | null; expires: number }
  >();
  return async function resolveSite(
    hostname: string
  ): Promise<ResolvedSite | null> {
    const hit = cache.get(hostname);
    if (hit && hit.expires > now()) return hit.value;
    const value = await load(hostname);
    cache.set(hostname, { value, expires: now() + ttlMs });
    return value;
  };
}
