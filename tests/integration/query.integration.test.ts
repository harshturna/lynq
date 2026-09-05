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
  // Session C: visitor 2, second session same day, mobile, direct, entry /pricing
  // Engagement, custom and vitals rows carry their pageview's path, as ingest writes them.
  // As ingest produces it, only session B's first pageview carries the
  // referrer, source and channel; later rows are '' / '' / Direct (TICKET-027).
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
    }),
    row({
      ts: at(131),
      seq: 3,
      visitor_id: 2,
      session_id: 22,
      pageview_id: 202,
      path: "/pricing",
      event: "custom",
      name: "signup",
      props: sql.json({ plan: "pro" }),
      revenue: "4900",
    }),
    row({
      ts: at(160),
      seq: 4,
      visitor_id: 2,
      session_id: 22,
      pageview_id: 203,
      path: "/docs",
    }),
    row({
      ts: at(161),
      seq: 5,
      visitor_id: 2,
      session_id: 22,
      pageview_id: 203,
      path: "/docs",
      event: "engagement",
      engaged_ms: 60000,
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
      path: "/pricing",
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
      path: "/pricing",
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
      path: "/pricing",
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
      path: "/pricing",
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
  it("attributes sources by session entry, counting each session once", async () => {
    const channel = await q.breakdown(ctx(), "entry_channel", "sessions");
    expect(channel.rows).toEqual([
      { value: "Direct", metric: 2 },
      { value: "Organic Search", metric: 1 },
    ]);
    const source = await q.breakdown(ctx(), "entry_source", "visitors");
    expect(source.rows).toEqual([
      { value: "", metric: 2 },
      { value: "Google", metric: 1 },
    ]);
    const referrer = await q.breakdown(ctx(), "entry_referrer", "pageviews");
    expect(referrer.rows.find((r) => r.value === "google.com")?.metric).toBe(3);
    await expect(q.breakdown(ctx(), "channel", "sessions")).rejects.toThrow(
      /cannot be broken down/
    );
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
    // an entry filter keeps the whole session, including its Direct rows
    const organic = await q.summary(
      ctx({
        filters: [
          { dimension: "entry_channel", op: "is", values: ["Organic Search"] },
        ],
      })
    );
    expect(organic.current).toMatchObject({ sessions: 1, pageviews: 3 });
    const notOrganic = await q.summary(
      ctx({
        filters: [
          { dimension: "entry_source", op: "is_not", values: ["Google"] },
        ],
      })
    );
    expect(notOrganic.current).toMatchObject({ sessions: 2, pageviews: 2 });
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
      source: string;
      channel: string;
    }>(ctx(), "sessions");
    expect(sessions.map((s) => s.session_id)).toEqual(["23", "22", "11"]);
    expect(sessions[2]).toMatchObject({ bounced: true, entry_path: "/" });
    expect(sessions[1]).toMatchObject({
      source: "Google",
      channel: "Organic Search",
    });
    expect(sessions[0]).toMatchObject({ source: "", channel: "Direct" });
  });
});

describe("phase 1 primitives (TICKET-034)", () => {
  const signup = { id: 1, kind: "event" as const, match: "signup" };
  const pricing = { id: 2, kind: "pageview" as const, match: "/pric*" };

  it("multi-metric breakdown groups row and session metrics separately", async () => {
    const { rows, total } = await q.breakdownMulti(ctx(), "path", [
      "pageviews",
      "visitors",
      "sessions",
      "bounce_rate",
    ]);
    expect(total).toBe(3);
    expect(rows).toEqual([
      {
        value: "/",
        pageviews: 2,
        visitors: 2,
        sessions: 2,
        bounce_rate: 50,
        total: 3,
      },
      {
        value: "/pricing",
        pageviews: 2,
        visitors: 1,
        sessions: 2,
        bounce_rate: 0,
        total: 3,
      },
      {
        value: "/docs",
        pageviews: 1,
        visitors: 1,
        sessions: 1,
        bounce_rate: 0,
        total: 3,
      },
    ]);
    const asc = await q.breakdownMulti(ctx(), "path", ["pageviews"], {
      orderBy: "pageviews",
      dir: "asc",
      limit: 1,
    });
    expect(asc.rows[0].value).toBe("/docs");
  });

  it("a session dimension with only session metrics reads the CTE alone", async () => {
    const entries = await q.breakdownMulti(ctx(), "entry_path", ["sessions"]);
    expect(entries.rows).toEqual([
      { value: "/", sessions: 2, total: 2 },
      { value: "/pricing", sessions: 1, total: 2 },
    ]);
  });

  it("two dimensions, revenue metrics and goal metrics", async () => {
    const matrix = await q.breakdownMulti(
      ctx(),
      ["browser", "os"],
      ["pageviews"]
    );
    expect(matrix.rows).toEqual([
      { value: "Chrome", value2: "Mac OS", pageviews: 5, total: 1 },
    ]);
    const money = await q.breakdownMulti(ctx(), "event_name", [
      "custom_events",
      "revenue",
      "payments",
      "last_seen",
    ]);
    expect(money.rows).toEqual([
      {
        value: "signup",
        custom_events: 1,
        revenue: 4900,
        payments: 1,
        last_seen: at(131).toISOString(),
        total: 1,
      },
    ]);
    const goals = await q.breakdownMulti(ctx(), "entry_channel", [
      "sessions",
      { kind: "goal_completions", goal: signup },
      { kind: "conversion", goal: signup },
    ]);
    expect(goals.rows).toEqual([
      {
        value: "Direct",
        sessions: 2,
        goal_completions: 0,
        conversion: 0,
        total: 2,
      },
      {
        value: "Organic Search",
        sessions: 1,
        goal_completions: 1,
        conversion: 100,
        total: 2,
      },
    ]);
  });

  it("goal stats and funnels order steps within a session", async () => {
    expect(await q.goalStats(ctx(), signup)).toEqual({
      completions: 1,
      converting_sessions: 1,
      sessions: 3,
      conversion: 33.33,
      revenue: 4900,
      median_seconds: 31,
    });
    const byPage = await q.goalStats(ctx(), pricing);
    expect(byPage).toMatchObject({
      completions: 2,
      converting_sessions: 2,
      median_seconds: 15,
    });
    expect(
      await q.funnel(ctx(), [
        { kind: "any" },
        { kind: "pageview", match: "/pricing" },
        { kind: "event", match: "signup" },
      ])
    ).toEqual([3, 2, 1]);
    // /docs comes after signup in session B, so it counts one way and not the other
    expect(
      await q.funnel(ctx(), [
        { kind: "event", match: "signup" },
        { kind: "pageview", match: "/docs" },
      ])
    ).toEqual([1, 1]);
    expect(
      await q.funnel(ctx(), [
        { kind: "pageview", match: "/docs" },
        { kind: "event", match: "signup" },
      ])
    ).toEqual([1, 0]);
  });

  it("revenue and payments over the range", async () => {
    expect(await q.revenue(ctx())).toEqual({ revenue: 4900, payments: 1 });
    expect(
      await q.revenue(
        ctx({
          filters: [{ dimension: "device", op: "is", values: ["mobile"] }],
        })
      )
    ).toEqual({ revenue: 0, payments: 0 });
  });

  it("trends for a few values in one statement", async () => {
    const t = await q.trends(ctx(), "path", ["/", "/pricing", "/nope"], "hour");
    expect(t.get("/")?.reduce((a, b) => a + b, 0)).toBe(2);
    expect(t.get("/pricing")?.[10]).toBe(1);
    expect(t.get("/pricing")?.[12]).toBe(1);
    expect(t.get("/nope")?.every((v) => v === 0)).toBe(true);
    const ev = await q.trends(
      ctx(),
      "event_name",
      ["signup"],
      "hour",
      "custom_events"
    );
    expect(ev.get("signup")?.[10]).toBe(1);
  });

  it("goal completions per bucket", async () => {
    const series = await q.goalTimeseries(ctx(), signup, "hour");
    expect(series).toHaveLength(24);
    expect(series[10].value).toBe(1);
    expect(series.reduce((a, p) => a + p.value, 0)).toBe(1);
  });

  it("page flow, heatmap, histogram and paths", async () => {
    const flow = await q.pageFlow(ctx(), "/pricing");
    expect(flow).toHaveLength(4);
    expect(flow).toEqual(
      expect.arrayContaining([
        { side: "from", kind: "page", value: "/", count: 1 },
        { side: "from", kind: "referrer", value: "", count: 1 },
        { side: "to", kind: "page", value: "/docs", count: 1 },
        { side: "to", kind: "exit", value: "", count: 1 },
      ])
    );
    const heat = await q.heatmap(ctx(), "country");
    expect(heat.map((r) => r.value)).toEqual(["CA", "US"]);
    expect(heat[0].hours[10]).toBe(2);
    expect(heat[1].hours[12]).toBe(1);
    expect(heat[0].hours.reduce((a, b) => a + b, 0)).toBe(2);
    expect(
      await q.histogram(ctx(), "screen_width", [0, 1000, 1500, 2000])
    ).toEqual([
      { from: 0, to: 1000, count: 0 },
      { from: 1000, to: 1500, count: 5 },
      { from: 1500, to: 2000, count: 0 },
      { from: 2000, to: null, count: 0 },
    ]);
    // the fixture has no viewport, and 0 is "unknown", never a band
    expect(
      (await q.histogram(ctx(), "viewport_width", [0, 640])).map((b) => b.count)
    ).toEqual([0, 0]);
    expect(await q.pathsTo(ctx(), "signup")).toEqual([
      { steps: ["/", "/pricing"], count: 1 },
    ]);
  });

  it("vitals attribution targets", async () => {
    // the fixture's vitals rows carry no lcp_target, so the query is exercised on emptiness
    expect(await q.vitalsTargets(ctx(), "lcp_target")).toEqual([]);
  });

  it("vitals by dimension and over time", async () => {
    const byDevice = await q.vitalsBreakdown(ctx(), "device");
    expect(byDevice).toHaveLength(1);
    expect(byDevice[0]).toMatchObject({
      value: "mobile",
      lcp: 3000,
      inp: 250,
      fcp: 950,
      ttfb: null,
      samples: 3,
    });
    expect(byDevice[0].cls).toBeCloseTo(0.125, 5);
    const series = await q.vitalsTimeseries(ctx(), "hour");
    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({
      device: "mobile",
      samples: 3,
      lcp: 3000,
    });
  });

  it("realtime reads the last 30 minutes by received_at", async () => {
    const now = new Date();
    const live = (over: Record<string, unknown>) =>
      row({
        ts: now,
        received_at: now,
        visitor_id: 9,
        session_id: 99,
        pageview_id: 901,
        ...over,
      });
    await sql`insert into analytics.events ${sql([
      live({ seq: 1, path: "/live", country: "DE" }),
      live({
        seq: 2,
        event: "custom",
        name: "ping",
        path: "/live",
        country: "DE",
      }),
    ])}`;
    try {
      const r = await q.realtime(ctx(), now);
      expect(r.visitors_now).toBe(1);
      expect(r.pages).toEqual([{ value: "/live", visitors: 1 }]);
      expect(r.sources).toEqual([{ value: "", sessions: 1 }]);
      expect(r.countries).toEqual([{ value: "DE", visitors: 1 }]);
      expect(r.per_minute).toHaveLength(30);
      expect(r.per_minute.reduce((a, m) => a + m.pageviews, 0)).toBe(1);
      expect(r.events.map((e) => e.event)).toEqual(["custom", "pageview"]);
      // a session chip composes over the same window: the live session has a
      // custom event, so it is not a bounce
      const bounced = await q.realtime(
        ctx({
          filters: [{ dimension: "bounced", op: "is", values: ["true"] }],
        }),
        now
      );
      expect(bounced.visitors_now).toBe(0);
      const engaged = await q.realtime(
        ctx({
          filters: [{ dimension: "bounced", op: "is", values: ["false"] }],
        }),
        now
      );
      expect(engaged.visitors_now).toBe(1);
    } finally {
      await sql`delete from analytics.events where site_id = ${siteId} and visitor_id = 9`;
    }
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
