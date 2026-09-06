import "server-only";
import { sql } from "@/lib/db";
import { buildContext } from "@/lib/query/authorize";
import { breakdownMulti, realtime, summary, timeseries } from "@/lib/query/run";

/**
 * The landing page's numbers (TICKET-057, D-014): the demo site's last 30
 * days and who is on it now. The demo site is the guest account's first
 * website, or DEMO_SITE_SLUG when set. Nothing here is authorised: the demo
 * site is public by design, and only these aggregates leave the server.
 */
export type DemoStats = {
  slug: string;
  visitors: number;
  /** Unique visitors per day, oldest first, 30 values. */
  series: number[];
  topPages: { path: string; visitors: number }[];
  visitorsNow: number;
};

type DemoSite = { id: number; slug: string; timezone: string };

export async function findDemoSite(): Promise<DemoSite | null> {
  const slug = process.env.DEMO_SITE_SLUG;
  const guest = process.env.GUEST_USER_ID;
  let rows: DemoSite[] = [];
  if (slug) {
    rows = await sql<DemoSite[]>`
      select w.id, w.slug, coalesce(s.timezone, 'UTC') as timezone
      from public.websites w left join analytics.site_settings s on s.site_id = w.id
      where w.slug = ${slug} and w.deleted_at is null limit 1`;
  } else if (guest) {
    rows = await sql<DemoSite[]>`
      select w.id, w.slug, coalesce(s.timezone, 'UTC') as timezone
      from public.websites w left join analytics.site_settings s on s.site_id = w.id
      where w.user_id = ${guest}::uuid and w.deleted_at is null
      order by w.id limit 1`;
  }
  const site = rows[0];
  return site ? { ...site, id: Number(site.id) } : null;
}

function contextFor(site: DemoSite, now = new Date()) {
  return buildContext(
    {
      siteId: site.id,
      timezone: site.timezone,
      kpiGoalId: null,
      breakpoints: [],
      shortcuts: false,
      bots: false,
    },
    { range: "last_30d", now }
  );
}

export async function getDemoStats(): Promise<DemoStats | null> {
  try {
    const site = await findDemoSite();
    if (!site) return null;
    const ctx = contextFor(site);
    const [sum, series, pages, live] = await Promise.all([
      summary(ctx),
      timeseries(ctx, "visitors", "day"),
      breakdownMulti(ctx, "path", ["visitors"], { limit: 5 }),
      realtime(ctx),
    ]);
    return {
      slug: site.slug,
      visitors: Number(sum.current.visitors ?? 0),
      series: series.map((p) => Number(p.value)),
      topPages: pages.rows.map((r) => ({
        path: r.value,
        visitors: Number(r.visitors ?? 0),
      })),
      visitorsNow: Number(live.visitors_now ?? 0),
    };
  } catch (err) {
    console.error("[landing] demo stats failed:", err);
    return null;
  }
}

/** Visitors on the demo site now, for the hero's live line. */
export async function getDemoVisitorsNow(): Promise<number | null> {
  try {
    const site = await findDemoSite();
    if (!site) return null;
    const live = await realtime(contextFor(site));
    return Number(live.visitors_now ?? 0);
  } catch (err) {
    console.error("[landing] demo live failed:", err);
    return null;
  }
}
