import { withTimeout } from "@/lib/db";

/**
 * Unique visitors per site over the trailing window, for the websites list.
 * Replaces the websites.visitors counter the v1 route incremented (TICKET-024).
 * Sites without rows are absent from the map; callers default to 0.
 */
export async function visitorsBySite(
  siteIds: number[],
  days = 30
): Promise<Map<number, number>> {
  if (!siteIds.length) return new Map();
  const rows = await withTimeout(
    10_000,
    (tx) =>
      tx<{ site_id: number; visitors: number }[]>`
      select site_id::int as site_id, count(distinct visitor_id)::int as visitors
      from analytics.events
      where site_id = any(${siteIds}::bigint[])
        and event = 'pageview'
        and not suspect
        and ts >= now() - make_interval(days => ${days})
      group by site_id`
  );
  return new Map(rows.map((r) => [Number(r.site_id), Number(r.visitors)]));
}
