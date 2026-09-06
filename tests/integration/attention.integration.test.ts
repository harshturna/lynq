import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  INFLUENCE_MIN_SESSIONS,
  READ_THROUGH_MIN_PAGEVIEWS,
} from "@/lib/query/attention";
import type { QueryContext } from "@/lib/query/primitives";

/**
 * Attention, read-through and influence (D-016) against a fixture built to
 * prove the rules rather than to look realistic: a page under the
 * read-through minimum, a page people reach only after converting, and two
 * pages either side of the influence comparison.
 */
process.env.LYNQ_DB_POOLER_URL = process.env.TEST_DATABASE_URL;

let sql: postgres.Sql;
let siteId: number;
let q: typeof import("@/lib/query/run");
const T0 = new Date("2026-09-01T10:00:00Z");
const at = (s: number) => new Date(T0.getTime() + s * 1000);
const range = {
  from: new Date("2026-09-01T00:00:00Z"),
  toExclusive: new Date("2026-09-02T00:00:00Z"),
};
const goal = { id: 1, kind: "event" as const, match: "signup" };

type Row = Record<string, unknown>;
const base = (over: Row): Row => ({
  site_id: siteId,
  ts: T0,
  received_at: T0,
  seq: 1,
  event: "pageview",
  name: "",
  visitor_id: 1,
  session_id: 1,
  user_hash: 0,
  pageview_id: 1,
  hostname: "attention-test.example",
  path: "/",
  title: "",
  query: "",
  referrer: "",
  referrer_url: "",
  source: "",
  channel: "Direct",
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
  country: "CA",
  region: "",
  city: "",
  device: "desktop",
  browser: "Chrome",
  browser_major: 128,
  browser_version: "",
  os: "Mac OS",
  os_version: "",
  screen_width: 1440,
  screen_height: 900,
  viewport_width: 1440,
  viewport_height: 800,
  language: "en",
  engaged_ms: 0,
  scroll_depth: 0,
  props: sql?.json({}) ?? {},
  revenue: null,
  lcp: null,
  cls: null,
  inp: null,
  fcp: null,
  ttfb: null,
  dcl: null,
  load: null,
  tti: null,
  tbt: null,
  resources: null,
  lcp_target: null,
  inp_target: null,
  suspect: false,
  ingest_version: 2,
  ...over,
});

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
  });
  const [site] = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('attention', 'attention-test.example', gen_random_uuid(), 'attention-test') returning id`;
  siteId = Number(site.id);

  const rows: Row[] = [];
  let pid = 0;
  let t = 0;
  /** One session: its pages in order, whether it converts, and how it reads. */
  const session = (
    id: number,
    pages: string[],
    opts: { converts?: boolean; engagedMs?: number; scroll?: number } = {}
  ) => {
    let seq = 0;
    for (const path of pages) {
      pid += 1;
      t += 2;
      rows.push(
        base({
          ts: at(t),
          seq: ++seq,
          visitor_id: id,
          session_id: id,
          pageview_id: pid,
          path,
        })
      );
      rows.push(
        base({
          ts: at(t + 1),
          seq: ++seq,
          event: "engagement",
          visitor_id: id,
          session_id: id,
          pageview_id: pid,
          path,
          engaged_ms: opts.engagedMs ?? 20_000,
          scroll_depth: opts.scroll ?? 90,
        })
      );
    }
    if (opts.converts) {
      t += 1;
      rows.push(
        base({
          ts: at(t),
          seq: ++seq,
          event: "custom",
          name: "signup",
          visitor_id: id,
          session_id: id,
          pageview_id: pid,
          path: pages.at(-1) ?? "/",
        })
      );
      // reached only by converting, so it must never earn influence
      pid += 1;
      t += 1;
      rows.push(
        base({
          ts: at(t),
          seq: ++seq,
          visitor_id: id,
          session_id: id,
          pageview_id: pid,
          path: "/welcome",
        })
      );
    }
  };

  // 60 sessions see /pricing, half of them convert; 60 do not, 6 convert.
  for (let i = 0; i < 60; i++)
    session(1000 + i, ["/", "/pricing"], { converts: i < 30 });
  for (let i = 0; i < 60; i++)
    session(2000 + i, ["/", "/blog/post"], { converts: i < 6 });
  // A page under the read-through minimum, read deeply by the few who saw it.
  for (let i = 0; i < READ_THROUGH_MIN_PAGEVIEWS - 5; i++)
    session(3000 + i, ["/rare"], { engagedMs: 60_000, scroll: 95 });
  // A page well over the minimum that nobody reads to the end.
  for (let i = 0; i < 40; i++)
    session(4000 + i, ["/skimmed"], { engagedMs: 30_000, scroll: 20 });

  for (let i = 0; i < rows.length; i += 500)
    await sql`insert into analytics.events ${sql(rows.slice(i, i + 500) as never[])}`;
  await sql`analyze analytics.events`;
  q = await import("@/lib/query/run");
}, 120_000);

afterAll(async () => {
  await sql`delete from analytics.events where site_id = ${siteId}`;
  await sql`delete from public.websites where id = ${siteId}`;
  const { sql: appSql } = await import("@/lib/db");
  await appSql.end();
  await sql.end();
});

const ctx = (): QueryContext => ({
  siteId,
  range,
  timezone: "UTC",
  filters: [],
});

describe("attention", () => {
  it("sums engaged time per page and shares add up", async () => {
    const { rows, siteAttentionMs } = await q.attention(ctx(), { limit: 50 });
    const by = Object.fromEntries(rows.map((r) => [r.value, r]));
    // 120 sessions saw "/" for 20 s each
    expect(by["/"].attention_ms).toBe(120 * 20_000);
    expect(by["/"].pageviews).toBe(120);
    expect(by["/pricing"].attention_ms).toBe(60 * 20_000);
    expect(rows[0].value).toBe("/");
    expect(siteAttentionMs).toBe(rows.reduce((n, r) => n + r.attention_ms, 0));
  });

  it("hides read-through under the minimum and reports it above", async () => {
    const { rows } = await q.attention(ctx(), { limit: 50 });
    const by = Object.fromEntries(rows.map((r) => [r.value, r]));
    expect(by["/rare"].pageviews).toBeLessThan(READ_THROUGH_MIN_PAGEVIEWS);
    expect(by["/rare"].read_through).toBeNull();
    // deep and slow: every view counts
    expect(by["/pricing"].read_through).toBe(100);
    // scrolled a fifth of the way, however long they stayed
    expect(by["/skimmed"].read_through).toBe(0);
  });
});

describe("influence", () => {
  it("ranks by lift and never credits a page reached by converting", async () => {
    const rows = await q.influence(ctx(), goal, { limit: 50 });
    const by = Object.fromEntries(rows.map((r) => [r.value, r]));
    // 30 of the 60 sessions that saw /pricing converted. The comparison is
    // every other session in the range (D-016), which is the 60 blog sessions
    // with 6 conversions plus the 65 single-page ones with none: 6 of 125.
    expect(by["/pricing"].sessions).toBe(60);
    expect(by["/pricing"].conversion).toBe(50);
    expect(by["/pricing"].conversion_without).toBe(4.8);
    expect(by["/pricing"].lift).toBe(10.42);
    expect(by["/blog/post"].lift).toBeLessThan(1);
    expect(rows[0].value).toBe("/pricing");
    // /welcome is only ever seen after the signup event
    expect(by["/welcome"]).toBeUndefined();
  });

  it("leaves lift null when a side is too small to compare", async () => {
    const rows = await q.influence(ctx(), goal, { limit: 50 });
    const rare = rows.find((r) => r.value === "/rare");
    expect(rare?.sessions).toBeLessThan(INFLUENCE_MIN_SESSIONS);
    expect(rare?.lift).toBeNull();
  });
});
