import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { CrawlerDayRow } from "@/lib/ingest/bots";
import type { QueryContext } from "@/lib/query/primitives";
import { generateCrawlerDays } from "../../scripts/seed/crawlers";

/**
 * D-018: crawler hits land in their own daily counter, a repeat adds to it,
 * the Bots reads answer from it, and housekeeping trims it.
 */
process.env.LYNQ_DB_POOLER_URL = process.env.TEST_DATABASE_URL;

let sql: postgres.Sql;
let siteId: number;
let deps: typeof import("@/lib/ingest/db-deps");
let q: typeof import("@/lib/query/run");
const until = new Date("2026-09-06T12:00:00Z");

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
  });
  const [site] = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('bots', 'bots-test.example', gen_random_uuid(), 'bots-test') returning id`;
  siteId = Number(site.id);
  deps = await import("@/lib/ingest/db-deps");
  q = await import("@/lib/query/run");
});

afterAll(async () => {
  await sql`delete from public.websites where id = ${siteId}`;
  const { sql: appSql } = await import("@/lib/db");
  await appSql.end();
  await sql.end();
});

const row = (over: Partial<CrawlerDayRow>): CrawlerDayRow => ({
  site_id: siteId,
  day: "2026-09-05",
  crawler: "Googlebot",
  family: "search",
  path: "/docs",
  hits: 1,
  last_status: 200,
  last_seen: new Date("2026-09-05T10:00:00Z"),
  ...over,
});

function ctx(days = 30): QueryContext {
  return {
    siteId,
    range: {
      from: new Date(until.getTime() - days * 86_400_000),
      toExclusive: until,
    },
    timezone: "America/Toronto",
    filters: [],
  };
}

describe("crawler_days", () => {
  it("upserts: a repeat adds to the counter and keeps the newest status", async () => {
    await deps.upsertCrawlerDays([row({ hits: 2 })]);
    await deps.upsertCrawlerDays([
      row({
        hits: 3,
        last_status: 304,
        last_seen: new Date("2026-09-05T11:00:00Z"),
      }),
      // an older report must not move last_seen or last_status backwards
      row({
        path: "/pricing",
        last_seen: new Date("2026-09-05T09:00:00Z"),
      }),
    ]);
    await deps.upsertCrawlerDays([
      row({
        hits: 1,
        last_status: 500,
        last_seen: new Date("2026-09-05T08:00:00Z"),
      }),
    ]);
    const rows = await sql<
      { path: string; hits: number; last_status: number; last_seen: Date }[]
    >`select path, hits, last_status, last_seen from analytics.crawler_days
      where site_id = ${siteId} order by path`;
    expect(
      rows.map((r) => [
        r.path,
        r.hits,
        r.last_status,
        r.last_seen.toISOString(),
      ])
    ).toEqual([
      ["/docs", 6, 304, "2026-09-05T11:00:00.000Z"],
      ["/pricing", 1, 200, "2026-09-05T09:00:00.000Z"],
    ]);
    await sql`delete from analytics.crawler_days where site_id = ${siteId}`;
  });

  it("answers the Bots reads over UTC days, ignoring the site's filters", async () => {
    const seeded = generateCrawlerDays({ siteId, days: 40, seed: 3, until });
    await deps.upsertCrawlerDays(seeded);
    const c = ctx(30);
    const [families, crawlers, pages, orientation] = await Promise.all([
      q.crawlerFamilies(c),
      q.crawlers(c, { limit: 5 }),
      q.crawlerPages(c, { limit: 5 }),
      q.crawlerOrientation(c),
    ]);
    // the days inside the range, summed by hand
    const inRange = seeded.filter(
      (r) => r.day >= "2026-08-07" && r.day <= "2026-09-06"
    );
    const total = inRange.reduce((a, r) => a + r.hits, 0);
    expect(families.reduce((a, f) => a + f.hits, 0)).toBe(total);
    expect(families[0].hits).toBeGreaterThanOrEqual(families[1].hits);
    expect(crawlers).toHaveLength(5);
    expect(crawlers[0].hits).toBeGreaterThanOrEqual(crawlers[1].hits);
    expect(crawlers[0].total).toBe(new Set(inRange.map((r) => r.crawler)).size);
    expect(pages.every((p) => p.path.startsWith("/"))).toBe(true);
    expect(orientation.map((o) => o.path).sort()).toEqual([
      "llms.txt",
      "robots.txt",
      "sitemap",
    ]);
    // a family narrows both the crawler and the page ranking
    const answers = await q.crawlerPages(c, { family: "answers", limit: 50 });
    const answersTotal = inRange
      .filter((r) => r.family === "answers" && r.path.startsWith("/"))
      .reduce((a, r) => a + r.hits, 0);
    expect(answers.reduce((a, r) => a + r.hits, 0)).toBe(answersTotal);
    // filters are not applied: a path filter changes nothing
    const filtered = await q.crawlerFamilies({
      ...c,
      filters: [{ dimension: "path", op: "is", values: ["/nowhere"] }],
    });
    expect(filtered).toEqual(families);
  });

  it("is trimmed by housekeeping at the same age as events", async () => {
    await deps.upsertCrawlerDays([
      row({ day: "2020-01-01", path: "/old" }),
      row({ day: "2026-09-01", path: "/new" }),
    ]);
    await sql`select analytics.housekeeping()`;
    const left = await sql<{ path: string }[]>`
      select path from analytics.crawler_days where site_id = ${siteId} and path in ('/old', '/new')`;
    expect(left.map((r) => r.path)).toEqual(["/new"]);
  });
});
