import { withTimeout } from "@/lib/db";
import { Query } from "./builder";
import { type GoalDef, goalPredicate } from "./goals";

/**
 * Per-site numbers for the sites list (design §8.12): unique visitors over
 * the trailing 30 days and the 30 before, a daily series for the sparkline,
 * the last event received, and KPI completions where a goal is set. Sites
 * without rows are absent from the map; callers default to zero.
 */
export const SITE_WINDOW_DAYS = 30;

export type SiteStats = {
  visitors: number;
  previous: number;
  /** Unique visitors per UTC day, oldest first, one entry per day of the window. */
  spark: number[];
  lastAt: Date | null;
  /** KPI completions in the window; null when the site has no KPI goal. */
  kpi: number | null;
};

export async function siteStats(
  sites: { siteId: number; goal: GoalDef | null }[],
  now = new Date()
): Promise<Map<number, SiteStats>> {
  const out = new Map<number, SiteStats>();
  if (!sites.length) return out;
  const ids = sites.map((s) => s.siteId);
  const day = 86_400_000;
  const from30 = new Date(now.getTime() - SITE_WINDOW_DAYS * day);
  const from60 = new Date(now.getTime() - 2 * SITE_WINDOW_DAYS * day);
  const [totals, daily, last] = await withTimeout(10_000, async (tx) => {
    const totals = await tx<
      { site_id: number; visitors: number; previous: number }[]
    >`
      select site_id::int as site_id,
             count(distinct visitor_id) filter (where ts >= ${from30})::int as visitors,
             count(distinct visitor_id) filter (where ts < ${from30})::int as previous
      from analytics.events
      where site_id = any(${ids}::bigint[]) and event = 'pageview' and not suspect
        and ts >= ${from60} and ts < ${now}
      group by 1`;
    const daily = await tx<{ site_id: number; d: Date; n: number }[]>`
      select site_id::int as site_id, date_trunc('day', ts) as d, count(distinct visitor_id)::int as n
      from analytics.events
      where site_id = any(${ids}::bigint[]) and event = 'pageview' and not suspect
        and ts >= ${from30} and ts < ${now}
      group by 1, 2`;
    // one index probe per site on events_site_received
    const last = await tx<{ site_id: number; last_at: Date | null }[]>`
      select s.site_id::int as site_id,
             (select max(e.received_at) from analytics.events e where e.site_id = s.site_id) as last_at
      from unnest(${ids}::bigint[]) as s(site_id)`;
    return [totals, daily, last] as const;
  });
  const days = Array.from({ length: SITE_WINDOW_DAYS }, (_, i) =>
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - (SITE_WINDOW_DAYS - 1 - i)
      )
    ).getTime()
  );
  for (const s of sites) {
    const t = totals.find((r) => Number(r.site_id) === s.siteId);
    const byDay = new Map(
      daily
        .filter((r) => Number(r.site_id) === s.siteId)
        .map((r) => [new Date(r.d).getTime(), Number(r.n)])
    );
    const l = last.find((r) => Number(r.site_id) === s.siteId);
    out.set(s.siteId, {
      visitors: Number(t?.visitors ?? 0),
      previous: Number(t?.previous ?? 0),
      spark: days.map((d) => byDay.get(d) ?? 0),
      lastAt: l?.last_at ? new Date(l.last_at) : null,
      kpi: null,
    });
  }
  // KPI completions, one small count per site with a goal
  await Promise.all(
    sites
      .filter((s) => s.goal)
      .map(async (s) => {
        const q = new Query();
        const pred = goalPredicate(q, s.goal as GoalDef);
        const text = `select count(*)::int as n from analytics.events e
          where e.site_id = ${q.p(s.siteId)} and not e.suspect and e.ts >= ${q.p(from30)} and e.ts < ${q.p(now)} and ${pred}`;
        const [row] = await withTimeout(10_000, (tx) =>
          tx.unsafe(text, q.params as never[])
        );
        const stats = out.get(s.siteId);
        if (stats)
          stats.kpi = Number(
            (row as unknown as { n: number } | undefined)?.n ?? 0
          );
      })
  );
  return out;
}
