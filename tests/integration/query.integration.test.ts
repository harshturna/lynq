import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { QueryContext } from "@/lib/query/primitives";

// The four primitives against real rows: two sessions with known shapes, a
// boundary event, a suspect row, and an anonymous identify.
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

function row(over: Record<string, unknown>) {
  return {
    site_id: siteId,
    ts: T0,
    received_at: T0,
    seq: 0,
    event: "pageview",
    name: "",
    visitor_id: 1,
    session_id: 1,
    user_hash: 0,
    pageview_id: 1,
    hostname: "aivia.byharsh.com",
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
    language: "en",
    engaged_ms: 0,
    scroll_depth: 0,
    props: sql.json({}),
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
    suspect: false,
    ingest_version: 2,
    ...over,
  };
}

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
  });
  const [site] = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('query', 'query-test.example', gen_random_uuid(), 'query-test') returning id`;
  siteId = Number(site.id);
  // Session A: visitor 1, one pageview, 3 s engaged -> bounce
  // Session B: visitor 2, three pageviews over a minute, one custom event with a prop, 60 s engaged
  // Session C: visitor 2, second session same day, mobile, from Google, entry /pricing
  await sql`insert into analytics.events ${sql([
    row({
      ts: at(0),
      seq: 1,
      visitor_id: 1,
      session_id: 11,
      pageview_id: 101,
      path: "/",
    }),
    row({
      ts: at(2),
      seq: 2,
      visitor_id: 1,
      session_id: 11,
      pageview_id: 101,
      event: "engagement",
      engaged_ms: 3000,
    }),

    row({
      ts: at(100),
      seq: 1,
      visitor_id: 2,
      session_id: 22,
      pageview_id: 201,
      path: "/",
      source: "Google",
      channel: "Organic Search",
      referrer: "google.com",
    }),
    row({
      ts: at(130),
      seq: 2,
      visitor_id: 2,
      session_id: 22,
      pageview_id: 202,
      path: "/pricing",
      source: "Google",
      channel: "Organic Search",
      referrer: "google.com",
    }),
    row({
      ts: at(131),
      seq: 3,
      visitor_id: 2,
      session_id: 22,
      pageview_id: 202,
      event: "custom",
      name: "signup",
      props: sql.json({ plan: "pro" }),
      revenue: "4900",
      source: "Google",
      channel: "Organic Search",
      referrer: "google.com",
    }),
    row({
      ts: at(160),
      seq: 4,
      visitor_id: 2,
      session_id: 22,
      pageview_id: 203,
      path: "/docs",
      source: "Google",
      channel: "Organic Search",
      referrer: "google.com",
    }),
    row({
      ts: at(161),
      seq: 5,
      visitor_id: 2,
      session_id: 22,
      pageview_id: 203,
      event: "engagement",
      engaged_ms: 60000,
      source: "Google",
      channel: "Organic Search",
      referrer: "google.com",
    }),

    row({
      ts: at(7200),
      seq: 1,
      visitor_id: 2,
      session_id: 23,
      pageview_id: 301,
      path: "/pricing",
      device: "mobile",
      country: "US",
    }),
    row({
      ts: at(7205),
      seq: 2,
      visitor_id: 2,
      session_id: 23,
      pageview_id: 301,
      event: "engagement",
      engaged_ms: 20000,
      device: "mobile",
      country: "US",
    }),

    // Session C reports three vitals samples with gaps: one row without CLS,
    // one without INP, so per-column p75 must ignore NULLs column by column
    row({
      ts: at(7210),
      seq: 3,
      visitor_id: 2,
      session_id: 23,
      pageview_id: 301,
      event: "vitals",
      device: "mobile",
      country: "US",
      lcp: 1000,
      cls: 0.05,
      inp: 100,
      fcp: 800,
      resources: 20,
    }),
    row({
      ts: at(7211),
      seq: 4,
      visitor_id: 2,
      session_id: 23,
      pageview_id: 301,
      event: "vitals",
      device: "mobile",
      country: "US",
      lcp: 2000,
      inp: 300,
      fcp: 900,
      resources: 40,
    }),
    row({
      ts: at(7212),
      seq: 5,
      visitor_id: 2,
      session_id: 23,
      pageview_id: 301,
      event: "vitals",
      device: "mobile",
      country: "US",
      lcp: 4000,
      cls: 0.15,
      fcp: 1000,
      resources: 60,
    }),

    // exactly at the exclusive end of the range: must not be counted
    row({
      ts: range.toExclusive,
      seq: 1,
      visitor_id: 3,
      session_id: 33,
      pageview_id: 401,
      path: "/boundary",
    }),
    // suspect: excluded by default
    row({
      ts: at(10),
      seq: 1,
      visitor_id: 4,
      session_id: 44,
      pageview_id: 501,
      path: "/suspect",
      suspect: true,
    }),
    row({
      ts: at(11),
      seq: 2,
      visitor_id: 4,
      session_id: 44,
      pageview_id: 501,
      event: "vitals",
      path: "/suspect",
      suspect: true,
      lcp: 99000,
    }),
  ])}`;
  q = await import("@/lib/query/run");
});
afterAll(async () => {
  await sql`delete from public.websites where id = ${siteId}`;
  const { sql: appSql } = await import("@/lib/db");
  await appSql.end();
  await sql.end();
});

function ctx(over: Partial<QueryContext> = {}): QueryContext {
  return { siteId, range, timezone: "UTC", filters: [], ...over };
}

describe("summary", () => {
  it("computes row and session metrics with the design's definitions", async () => {
    const { current, compare } = await q.summary(ctx());
    expect(current).toMatchObject({
      pageviews: 5,
      visitors: 2,
      custom_events: 1,
      sessions: 3,
      pages_per_session: 1.67,
    });
    expect(current.bounce_rate).toBeCloseTo(33.33, 1); // only session A bounces (C has 20 s engaged)
    expect(current.engaged_time).toBe(Math.round((3000 + 60000 + 20000) / 3));
    expect(compare).toBeNull();
  });
  it("counts a boundary event once and never in the previous period either", async () => {
    const prev = {
      from: new Date("2026-08-31T00:00:00Z"),
      toExclusive: range.from,
    };
    const { current, compare } = await q.summary(ctx({ compare: prev }));
    expect(current.pageviews).toBe(5);
    expect(compare?.pageviews).toBe(0);
    const later = await q.summary(
      ctx({
        range: {
          from: range.toExclusive,
          toExclusive: new Date("2026-09-03T00:00:00Z"),
        },
      })
    );
    expect(later.current.pageviews).toBe(1);
  });
  it("includes suspect rows only when asked", async () => {
    expect(
      (await q.summary(ctx({ includeSuspect: true }))).current.pageviews
    ).toBe(6);
  });
});

describe("timeseries", () => {
  it("zero-fills hours and buckets sessions by their start", async () => {
    const pv = await q.timeseries(ctx(), "pageviews", "hour");
    expect(pv).toHaveLength(24);
    expect(pv[10]?.value).toBe(4);
    expect(pv[12]?.value).toBe(1);
    const sess = await q.timeseries(ctx(), "sessions", "hour");
    expect(sess[10]?.value).toBe(2);
    expect(sess[12]?.value).toBe(1);
  });
});

describe("breakdown", () => {
  it("row dimension with a row metric, with total", async () => {
    const { rows, total } = await q.breakdown(ctx(), "path", "pageviews", {
      limit: 2,
    });
    expect(rows).toEqual([
      { value: "/", metric: 2 },
      { value: "/pricing", metric: 2 },
    ]);
    expect(total).toBe(3);
  });
  it("entry and exit pages, and session metrics by a session-constant dimension", async () => {
    const entry = await q.breakdown(ctx(), "entry_path", "sessions");
    expect(entry.rows).toEqual([
      { value: "/", metric: 2 },
      { value: "/pricing", metric: 1 },
    ]);
    const exit = await q.breakdown(ctx(), "exit_path", "sessions");
    expect(exit.rows.find((r) => r.value === "/docs")?.metric).toBe(1);
    const bounce = await q.breakdown(ctx(), "device", "bounce_rate");
    expect(bounce.rows.find((r) => r.value === "desktop")?.metric).toBe(50);
    expect(bounce.rows.find((r) => r.value === "mobile")?.metric).toBe(0);
  });
  it("custom event names and prop values", async () => {
    expect(
      (await q.breakdown(ctx(), "event_name", "custom_events")).rows
    ).toEqual([{ value: "signup", metric: 1 }]);
    expect(
      (await q.breakdown(ctx(), "prop:plan", "custom_events")).rows
    ).toEqual([{ value: "pro", metric: 1 }]);
    expect(
      (await q.breakdown(ctx(), "prop_key", "custom_events")).rows
    ).toEqual([{ value: "plan", metric: 1 }]);
  });
});

describe("filters", () => {
  it("a row filter narrows rows; a session filter selects whole sessions", async () => {
    const rowOnly = await q.summary(
      ctx({ filters: [{ dimension: "path", op: "is", values: ["/pricing"] }] })
    );
    expect(rowOnly.current.pageviews).toBe(2);
    // sessions that touched /pricing: B and C, whole sessions -> 4 pageviews, no bounce
    expect(rowOnly.current.sessions).toBe(2);
    expect(rowOnly.current.bounce_rate).toBe(0);
    const entry = await q.summary(
      ctx({
        filters: [{ dimension: "entry_path", op: "is", values: ["/pricing"] }],
      })
    );
    expect(entry.current).toMatchObject({ sessions: 1, pageviews: 1 });
    const contains = await q.breakdown(
      ctx({
        filters: [{ dimension: "path", op: "contains", values: ["doc"] }],
      }),
      "path",
      "pageviews"
    );
    expect(contains.rows).toEqual([{ value: "/docs", metric: 1 }]);
  });
});

describe("rows", () => {
  it("lists recent custom events, one session's timeline, and sessions", async () => {
    const events = await q.rows<{
      name: string;
      props: Record<string, string>;
      revenue: number;
    }>(ctx(), "events");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: "signup",
      props: { plan: "pro" },
      revenue: 4900,
    });
    const timeline = await q.rows<{ event: string; path: string }>(
      ctx(),
      "session",
      { visitorId: BigInt(2), sessionId: BigInt(22) }
    );
    expect(timeline.map((r) => r.event)).toEqual([
      "pageview",
      "pageview",
      "custom",
      "pageview",
      "engagement",
    ]);
    const sessions = await q.rows<{
      session_id: string;
      bounced: boolean;
      entry_path: string;
    }>(ctx(), "sessions");
    expect(sessions.map((s) => s.session_id)).toEqual(["23", "22", "11"]);
    expect(sessions[2]).toMatchObject({ bounced: true, entry_path: "/" });
  });
});

describe("vitals", () => {
  it("takes p75 per column, ignoring NULLs column by column", async () => {
    const v = await q.vitals(ctx());
    expect(v.samples).toBe(3);
    expect(v.lcp).toBe(3000); // 1000, 2000, 4000
    expect(v.cls).toBeCloseTo(0.125); // 0.05, 0.15: the row without CLS drops out
    expect(v.inp).toBe(250); // 100, 300
    expect(v.fcp).toBe(950);
    expect(v.ttfb).toBeNull();
    expect(v.resources).toBe(40);
  });
  it("honours filters and the suspect flag", async () => {
    const mobile = await q.vitals(
      ctx({ filters: [{ dimension: "device", op: "is", values: ["mobile"] }] })
    );
    expect(mobile.samples).toBe(3);
    const desktop = await q.vitals(
      ctx({ filters: [{ dimension: "device", op: "is", values: ["desktop"] }] })
    );
    expect(desktop).toMatchObject({ samples: 0, lcp: null, resources: null });
    const withSuspect = await q.vitals(ctx({ includeSuspect: true }));
    expect(withSuspect.samples).toBe(4);
    expect(withSuspect.lcp).toBeGreaterThan(3000);
  });
});
