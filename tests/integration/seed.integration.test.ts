import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EVENT_COLUMNS } from "@/lib/ingest/rows";
import type { QueryContext } from "@/lib/query/primitives";
import { generate, SEED_INGEST_VERSION } from "../../scripts/seed/generate";

// The seed generator's rows must insert as-is and read back through the
// query layer with the numbers the generator counted.
process.env.LYNQ_DB_POOLER_URL = process.env.TEST_DATABASE_URL;

let sql: postgres.Sql;
let siteId: number;
let q: typeof import("@/lib/query/run");
const until = new Date("2026-09-05T00:00:00Z");
const opts = {
  hostname: "seed-test.example",
  days: 7,
  visitorsPerDay: 15,
  seed: 3,
  secret: "s",
  until,
};
let stats: ReturnType<typeof generate>["stats"];

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
    types: { bigint: postgres.BigInt },
  });
  const [site] = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('seed', 'seed-test.example', gen_random_uuid(), 'seed-test') returning id`;
  siteId = Number(site.id);
  const out = generate({ ...opts, siteId });
  stats = out.stats;
  for (let i = 0; i < out.rows.length; i += 1000) {
    const chunk = out.rows
      .slice(i, i + 1000)
      .map((r) => ({ ...r, props: sql.json(r.props) })) as unknown as Record<
      string,
      unknown
    >[];
    await sql`insert into analytics.events ${sql(chunk, ...([...EVENT_COLUMNS] as string[]))}`;
  }
  q = await import("@/lib/query/run");
});
afterAll(async () => {
  await sql`delete from analytics.events where site_id = ${siteId}`;
  await sql`delete from public.websites where id = ${siteId}`;
  const { sql: appSql } = await import("@/lib/db");
  await appSql.end();
  await sql.end();
});

function ctx(): QueryContext {
  return {
    siteId,
    range: {
      from: new Date(until.getTime() - 7 * 86_400_000),
      toExclusive: until,
    },
    timezone: "UTC",
    filters: [],
  };
}

describe("seeded rows through the query layer", () => {
  it("inserts every generated row and the summary matches the generator's counts", async () => {
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from analytics.events where site_id = ${siteId} and ingest_version = ${SEED_INGEST_VERSION}`;
    expect(n).toBe(stats.rows);
    const { current } = await q.summary(ctx());
    expect(current.pageviews).toBe(stats.pageviews);
    expect(current.sessions).toBe(stats.sessions);
    expect(current.visitors).toBe(stats.visitors);
    expect(current.sessions).toBeGreaterThan(current.visitors);
    expect(current.custom_events).toBe(stats.custom);
    expect(current.bounce_rate).toBeCloseTo(
      (stats.bounced / stats.sessions) * 100,
      0
    );
  });

  it("gives every breakdown the dashboard shows something to rank", async () => {
    for (const dim of [
      "path",
      "referrer",
      "source",
      "channel",
      "country",
      "device",
      "browser",
      "os",
      "event_name",
    ]) {
      const { rows } = await q.breakdown(ctx(), dim, "pageviews", { limit: 5 });
      expect(rows.length, dim).toBeGreaterThan(0);
    }
    const v = await q.vitals(ctx());
    expect(v.samples).toBe(stats.vitals);
    expect(v.lcp).toBeGreaterThan(0);
    const events = await q.rows<{ name: string; revenue: number | null }>(
      ctx(),
      "events",
      { limit: 500 }
    );
    expect(
      events.some((e) => e.name === "purchase" && Number(e.revenue) > 0)
    ).toBe(true);
  });
});
