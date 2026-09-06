import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EVENT_COLUMNS } from "@/lib/ingest/rows";
import type { QueryContext } from "@/lib/query/primitives";
import { generate } from "../../scripts/seed/generate";

/**
 * TICKET-074: the sessions list narrowed to a goal holds only sessions that
 * completed it, the screen's filters still apply on top, and a visitor's own
 * day lists their sessions.
 */
process.env.LYNQ_DB_POOLER_URL = process.env.TEST_DATABASE_URL;

const until = new Date("2026-09-06T12:00:00Z");
let sql: postgres.Sql;
let siteId: number;
let q: typeof import("@/lib/query/run");

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
    types: { bigint: postgres.BigInt },
  });
  const [w] = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('journeys', 'journeys-test.example', gen_random_uuid(), 'journeys-test') returning id`;
  siteId = Number(w.id);
  const { rows } = generate({
    siteId,
    hostname: "journeys-test.example",
    days: 14,
    visitorsPerDay: 20,
    seed: 5,
    secret: "j",
    until,
  });
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows
      .slice(i, i + 1000)
      .map((r) => ({ ...r, props: sql.json(r.props) })) as unknown as Record<
      string,
      unknown
    >[];
    await sql`insert into analytics.events ${sql(chunk, ...([...EVENT_COLUMNS] as string[]))}`;
  }
  q = await import("@/lib/query/run");
}, 120_000);

afterAll(async () => {
  await sql`delete from analytics.events where site_id = ${siteId}`;
  await sql`delete from public.websites where id = ${siteId}`;
  const { sql: appSql } = await import("@/lib/db");
  await appSql.end();
  await sql.end();
});

const ctx = (over: Partial<QueryContext> = {}): QueryContext => ({
  siteId,
  range: {
    from: new Date(until.getTime() - 14 * 86_400_000),
    toExclusive: until,
  },
  timezone: "UTC",
  filters: [],
  ...over,
});

describe("session lists", () => {
  it("narrowed to a goal, holds only sessions that completed it, newest first", async () => {
    const goal = { kind: "event" as const, match: "signup" };
    const list = await q.sessionList(ctx(), { goal, limit: 20 });
    expect(list.length).toBeGreaterThan(0);
    expect(list.length).toBeLessThanOrEqual(20);
    for (let i = 1; i < list.length; i++)
      expect(list[i - 1].started >= list[i].started).toBe(true);
    for (const s of list.slice(0, 5)) {
      const [{ n }] = await sql<{ n: number }[]>`
        select count(*)::int as n from analytics.events
        where site_id = ${siteId} and visitor_id = ${s.visitor_id}::bigint and session_id = ${s.session_id}::bigint
          and event = 'custom' and name = 'signup'`;
      expect(n).toBeGreaterThan(0);
      expect(s.customs).toBeGreaterThan(0);
    }
    // the same list with a page goal
    const pages = await q.sessionList(ctx(), {
      goal: { kind: "pageview", match: "/pricing" },
      limit: 5,
    });
    expect(pages.length).toBe(5);
  });

  it("keeps the screen's filters on top of the goal", async () => {
    const goal = { kind: "event" as const, match: "signup" };
    const all = await q.sessionList(ctx(), { goal, limit: 200 });
    const canada = await q.sessionList(
      ctx({ filters: [{ dimension: "country", op: "is", values: ["CA"] }] }),
      { goal, limit: 200 }
    );
    expect(canada.length).toBeLessThan(all.length);
    expect(canada.every((s) => s.country === "CA")).toBe(true);
    // a path filter narrows to sessions that saw the page, not to sessions where the goal fired there
    const saw = await q.sessionList(
      ctx({
        filters: [
          { dimension: "path", op: "is", values: ["/docs/getting-started"] },
        ],
      }),
      { limit: 200 }
    );
    expect(saw.length).toBeGreaterThan(0);
    expect(saw.some((s) => s.entry_path !== "/docs/getting-started")).toBe(
      true
    );
  });

  it("lists one visitor's sessions in their day", async () => {
    const [top] = await q.sessionList(ctx(), { limit: 1 });
    const started = new Date(top.started);
    const dayStart = new Date(
      Math.floor(started.getTime() / 86_400_000) * 86_400_000
    );
    const day = await q.sessionList(
      ctx({
        range: {
          from: dayStart,
          toExclusive: new Date(dayStart.getTime() + 86_400_000),
        },
      }),
      { visitorId: BigInt(top.visitor_id), limit: 50 }
    );
    expect(day.some((s) => s.session_id === top.session_id)).toBe(true);
    expect(day.every((s) => s.visitor_id === top.visitor_id)).toBe(true);
  });
});
