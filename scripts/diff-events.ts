/**
 * Compares the old tables with analytics.events for one site and one UTC day
 * (design §11): pageviews, visitors, sessions, bounce rate, top paths and top
 * session referrers, from four places: the old tables read directly (no row
 * cap), and events with ingest_version 0 (backfill), 1 (v1 adapter), 2 (v2).
 * Also reports suspect rows, ingest_log stages and empty paths for the day.
 *
 *   npx tsx scripts/diff-events.ts --site aivia.byharsh.com --day 2026-09-05
 */
import postgres from "postgres";

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length - 1; i += 2)
  args.set(String(process.argv[i]).slice(2), String(process.argv[i + 1]));
const siteUrl = args.get("site") ?? "";
const day = args.get("day") ?? new Date().toISOString().slice(0, 10);
if (!siteUrl || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
  console.error("usage: --site <url> --day YYYY-MM-DD");
  process.exit(2);
}
const from = new Date(`${day}T00:00:00Z`);
const to = new Date(from.getTime() + 86_400_000);
const sql = postgres(process.env.LYNQ_DB_POOLER_URL as string, {
  prepare: false,
  max: 1,
});

type Side = {
  pageviews: number;
  visitors: number;
  sessions: number;
  bounce_rate: number | null;
  top_paths: string[];
  top_referrers: string[];
};

async function oldTables(): Promise<Side> {
  const [c] = await sql<
    { pageviews: number; visitors: number; sessions: number }[]
  >`
    select (select count(*)::int from public.page_views where website_url = ${siteUrl} and created_at >= ${from} and created_at < ${to}) as pageviews,
           (select count(distinct client_id)::int from public.sessions where website_url = ${siteUrl} and created_at >= ${from} and created_at < ${to}) as visitors,
           (select count(*)::int from public.sessions where website_url = ${siteUrl} and created_at >= ${from} and created_at < ${to}) as sessions`;
  const [b] = await sql<{ bounce: number | null }[]>`
    select round(100.0 * count(*) filter (where coalesce(session_duration, 0) < 10000) / nullif(count(*), 0), 2)::float8 as bounce
    from public.sessions where website_url = ${siteUrl} and created_at >= ${from} and created_at < ${to}`;
  const paths = await sql<{ pathname: string }[]>`
    select pathname from public.page_views where website_url = ${siteUrl} and created_at >= ${from} and created_at < ${to}
    group by 1 order by count(*) desc, 1 limit 5`;
  const refs = await sql<{ r: string }[]>`
    select coalesce(nullif(nullif(referrer, 'Direct'), 'Unknown'), '') as r from public.page_views
    where website_url = ${siteUrl} and created_at >= ${from} and created_at < ${to}
    group by 1 order by count(*) desc, 1 limit 5`;
  return {
    pageviews: c?.pageviews ?? 0,
    visitors: c?.visitors ?? 0,
    sessions: c?.sessions ?? 0,
    bounce_rate: b?.bounce ?? null,
    top_paths: paths.map((p) => p.pathname),
    top_referrers: refs.map((r) => r.r),
  };
}

async function events(siteId: number, version: number): Promise<Side> {
  const [c] = await sql<
    { pageviews: number; visitors: number; sessions: number }[]
  >`
    select count(*) filter (where event = 'pageview')::int as pageviews,
           count(distinct visitor_id)::int as visitors,
           count(distinct (visitor_id, session_id))::int as sessions
    from analytics.events where site_id = ${siteId} and ingest_version = ${version} and ts >= ${from} and ts < ${to} and not suspect`;
  const [b] = await sql<{ bounce: number | null }[]>`
    with sess as (
      select visitor_id, session_id,
        count(*) filter (where event = 'pageview') as pv, coalesce(sum(engaged_ms), 0) as ms, count(*) filter (where event = 'custom') as cu
      from analytics.events where site_id = ${siteId} and ingest_version = ${version} and ts >= ${from} and ts < ${to} and not suspect
      group by 1, 2)
    select round(100.0 * count(*) filter (where pv = 1 and ms < 10000 and cu = 0) / nullif(count(*), 0), 2)::float8 as bounce from sess`;
  const paths = await sql<{ path: string }[]>`
    select path from analytics.events where site_id = ${siteId} and ingest_version = ${version} and event = 'pageview' and ts >= ${from} and ts < ${to} and not suspect
    group by 1 order by count(*) desc, 1 limit 5`;
  const refs = await sql<{ referrer: string }[]>`
    select referrer from analytics.events where site_id = ${siteId} and ingest_version = ${version} and event = 'pageview' and ts >= ${from} and ts < ${to} and not suspect
    group by 1 order by count(*) desc, 1 limit 5`;
  return {
    pageviews: c?.pageviews ?? 0,
    visitors: c?.visitors ?? 0,
    sessions: c?.sessions ?? 0,
    bounce_rate: b?.bounce ?? null,
    top_paths: paths.map((p) => p.path),
    top_referrers: refs.map((r) => r.referrer),
  };
}

async function main() {
  const [site] = await sql<
    { id: number }[]
  >`select id from public.websites where url = ${siteUrl}`;
  if (!site) throw new Error(`no website ${siteUrl}`);
  const siteId = Number(site.id);
  const sides: Record<string, Side> = {
    old_tables: await oldTables(),
    backfill_v0: await events(siteId, 0),
    adapter_v1: await events(siteId, 1),
    tracker_v2: await events(siteId, 2),
  };
  console.log(`site ${siteUrl} (#${siteId}) day ${day} UTC`);
  const metrics: (keyof Side)[] = [
    "pageviews",
    "visitors",
    "sessions",
    "bounce_rate",
    "top_paths",
    "top_referrers",
  ];
  for (const m of metrics) {
    const cells = Object.entries(sides).map(
      ([k, v]) =>
        `${k}=${Array.isArray(v[m]) ? JSON.stringify(v[m]) : String(v[m])}`
    );
    console.log(`${m.padEnd(14)} ${cells.join("  ")}`);
  }
  const [health] = await sql<{ suspect: number; empty_path: number }[]>`
    select count(*) filter (where suspect)::int as suspect, count(*) filter (where path = '')::int as empty_path
    from analytics.events where site_id = ${siteId} and ts >= ${from} and ts < ${to}`;
  const log = await sql<{ stage: string; n: number }[]>`
    select stage, count(*)::int as n from analytics.ingest_log where ts >= ${from} and ts < ${to} and (site_id = ${siteId} or site_id is null) group by 1 order by 2 desc`;
  console.log(
    `health         suspect=${health?.suspect ?? 0} empty_path=${health?.empty_path ?? 0} ingest_log=${JSON.stringify(Object.fromEntries(log.map((l) => [l.stage, l.n])))}`
  );
  const gate = (a: number, b: number) =>
    a === 0 && b === 0
      ? "n/a"
      : Math.abs(a - b) <= Math.max(1, 0.01 * Math.max(a, b))
        ? "within 1%"
        : `DIFFERS (${a} vs ${b})`;
  // The adapter has rows only from its deploy (TICKET-015), the backfill only before it.
  const CUTOFF = "2026-09-05T15:26:54.220Z";
  const beforeCutoff = to.getTime() <= new Date(CUTOFF).getTime();
  const oldVsNew = beforeCutoff
    ? `old vs backfill pageviews: ${gate(sides.old_tables.pageviews, sides.backfill_v0.pageviews)}`
    : `old vs adapter pageviews (rows since cutoff only): ${gate(sides.old_tables.pageviews, sides.adapter_v1.pageviews)}`;
  console.log(
    `gates          ${oldVsNew}; adapter vs tracker v2 pageviews: ${gate(sides.adapter_v1.pageviews, sides.tracker_v2.pageviews)}`
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
