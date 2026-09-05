/**
 * Seed demo traffic into analytics.events for one site (TICKET-026).
 *
 *   npm run seed -- [--site aivia.byharsh.com] [--days 365] [--visitors 40] [--seed 1] [--dry-run] [--wipe-only]
 *
 * Re-runnable: every run first deletes the site's rows with ingest_version 9
 * (only ever written by this script), then inserts a fresh year. Real tracker
 * rows (ingest_version 2) are never touched. Needs LYNQ_DB_POOLER_URL; uses
 * LYNQ_IDENTITY_SECRET for user hashes when set.
 */
import postgres from "postgres";
import { EVENT_COLUMNS, type EventRow } from "../lib/ingest/rows";
import { generate, SEED_INGEST_VERSION } from "./seed/generate";

const args = new Map<string, string | true>();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a?.startsWith("--")) continue;
  const next = process.argv[i + 1];
  if (next && !next.startsWith("--")) {
    args.set(a.slice(2), next);
    i++;
  } else args.set(a.slice(2), true);
}
const num = (key: string, fallback: number) => {
  const v = args.get(key);
  const n = typeof v === "string" ? Number(v) : fallback;
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`--${key} must be a positive number`);
    process.exit(2);
  }
  return n;
};
const siteUrl = String(args.get("site") ?? "aivia.byharsh.com");
const days = num("days", 365);
const visitorsPerDay = num("visitors", 40);
const seed = num("seed", 1);
const dryRun = args.get("dry-run") === true;
const wipeOnly = args.get("wipe-only") === true;

const dbUrl = process.env.LYNQ_DB_POOLER_URL;
if (!dbUrl) {
  console.error("LYNQ_DB_POOLER_URL must be set");
  process.exit(2);
}
const secret = process.env.LYNQ_IDENTITY_SECRET ?? "lynq-seed";

const sql = postgres(dbUrl, {
  prepare: false,
  max: 1,
  types: { bigint: postgres.BigInt },
});

async function main() {
  const [site] = await sql<{ id: bigint; url: string }[]>`
    select id, url from public.websites where url = ${siteUrl} and deleted_at is null`;
  if (!site) {
    console.error(`no website with url ${siteUrl}`);
    process.exit(1);
  }
  const siteId = Number(site.id);
  const [{ existing }] = await sql<{ existing: number }[]>`
    select count(*)::int as existing from analytics.events where site_id = ${siteId} and ingest_version = ${SEED_INGEST_VERSION}`;
  console.log(`site ${siteUrl} (#${siteId}); ${existing} seeded rows present`);

  const t0 = Date.now();
  const { rows, stats } = wipeOnly
    ? { rows: [] as EventRow[], stats: null }
    : generate({
        siteId,
        hostname: siteUrl,
        days,
        visitorsPerDay,
        seed,
        secret,
      });
  if (stats) {
    console.log(
      `generated in ${Date.now() - t0} ms:`,
      JSON.stringify({ ...stats, revenue: Number(stats.revenue.toFixed(2)) })
    );
    console.log(
      `bounce rate ${((stats.bounced / stats.sessions) * 100).toFixed(1)}%, pageviews per session ${(stats.pageviews / stats.sessions).toFixed(2)}`
    );
  }
  if (dryRun) {
    console.log("dry run: nothing written");
    return;
  }

  const wiped =
    await sql`delete from analytics.events where site_id = ${siteId} and ingest_version = ${SEED_INGEST_VERSION}`;
  console.log(`wiped ${wiped.count} seeded rows`);
  if (wipeOnly) return;

  const columns = [...EVENT_COLUMNS];
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows
      .slice(i, i + 1000)
      .map((r) => ({ ...r, props: sql.json(r.props) })) as unknown as Record<
      string,
      unknown
    >[];
    await sql`insert into analytics.events ${sql(chunk, ...(columns as string[]))}`;
    if ((i / 1000) % 20 === 0 || i + 1000 >= rows.length)
      console.log(`inserted ${Math.min(i + 1000, rows.length)}/${rows.length}`);
  }
  const [check] = await sql<{ n: number; first: Date; last: Date }[]>`
    select count(*)::int as n, min(ts) as first, max(ts) as last from analytics.events where site_id = ${siteId} and ingest_version = ${SEED_INGEST_VERSION}`;
  console.log(
    `analytics.events now holds ${check.n} seeded rows for the site, ${check.first?.toISOString()} to ${check.last?.toISOString()}`
  );
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
