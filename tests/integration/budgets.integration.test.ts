import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EVENT_COLUMNS } from "@/lib/ingest/rows";
import type { QueryContext } from "@/lib/query/primitives";
import { generate } from "../../scripts/seed/generate";

/**
 * Query budgets (design §9): every primitive a screen calls, timed on a seed
 * fixture, with assertions at 50% headroom over what was measured on the
 * Supabase Postgres image on a laptop. A regression here means a screen
 * will miss its 1.5 s section timeout on the seeded site long before a
 * user notices.
 */
process.env.LYNQ_DB_POOLER_URL = process.env.TEST_DATABASE_URL;

let sql: postgres.Sql;
let siteId: number;
let q: typeof import("@/lib/query/run");
const until = new Date("2026-09-05T00:00:00Z");
const DAYS = 90;

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
    types: { bigint: postgres.BigInt },
  });
  const [site] = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('budget', 'budget-test.example', gen_random_uuid(), 'budget-test') returning id`;
  siteId = Number(site.id);
  const out = generate({
    hostname: "budget-test.example",
    days: DAYS,
    visitorsPerDay: 40,
    seed: 7,
    secret: "b",
    until,
    siteId,
  });
  for (let i = 0; i < out.rows.length; i += 1000) {
    const chunk = out.rows
      .slice(i, i + 1000)
      .map((r) => ({ ...r, props: sql.json(r.props) })) as unknown as Record<
      string,
      unknown
    >[];
    await sql`insert into analytics.events ${sql(chunk, ...([...EVENT_COLUMNS] as string[]))}`;
  }
  await sql`analyze analytics.events`;
  // as in production, where housekeeping has rolled every day but the last two
  await sql`select analytics.rollup_refresh(${new Date(until.getTime() - 2 * 86_400_000)}::date)`;
  q = await import("@/lib/query/run");
}, 300_000);
afterAll(async () => {
  await sql`delete from analytics.rollup_daily where site_id = ${siteId}`;
  await sql`delete from analytics.rollup_state where site_id = ${siteId}`;
  await sql`delete from analytics.events where site_id = ${siteId}`;
  await sql`delete from public.websites where id = ${siteId}`;
  const { sql: appSql } = await import("@/lib/db");
  await appSql.end();
  await sql.end();
});

function ctx(over: Partial<QueryContext> = {}): QueryContext {
  return {
    siteId,
    range: {
      from: new Date(until.getTime() - DAYS * 86_400_000),
      toExclusive: until,
    },
    timezone: "America/Toronto",
    filters: [],
    ...over,
  };
}

/**
 * Budgets in ms: measured × 1.5 rounded up to the next 10, with a 30 ms floor
 * so a 3 ms query does not fail on scheduler jitter. Measured 2026-09-06 on
 * 47,601 rows (90 days × 40 visitors/day, seed 7) with the rollup filled
 * through two days before the range end (D-015): summary 25, timeseries
 * 58/68, breakdown_path 13, breakdownMulti_path 26, entry_channel with goal
 * metrics 34, matrix 33, prop_key 4, realtime 2, pageFlow 118, goalStats 84,
 * funnel 94, heatmap 37, histogram 19, pathsTo 5, vitals 25/25/28,
 * rows_sessions 104. Re-measure and update when a primitive changes shape.
 */
const BUDGET: Record<string, number> = {
  summary: 40,
  timeseries_pageviews: 90,
  timeseries_sessions: 110,
  breakdown_path: 30,
  breakdownMulti_path: 40,
  breakdownMulti_entry_channel_goals: 60,
  breakdownMulti_matrix: 50,
  breakdown_prop_key: 30,
  realtime: 30,
  pageFlow: 150,
  goalStats: 110,
  funnel: 120,
  heatmap: 50,
  histogram: 30,
  pathsTo: 30,
  vitals: 40,
  vitalsBreakdown: 40,
  vitalsTimeseries: 40,
  rows_sessions: 140,
};

async function timed<T>(name: string, fn: () => Promise<T>): Promise<number> {
  await fn(); // warm the plan and the cache once; screens hit warm caches too
  const t0 = performance.now();
  await fn();
  return Math.round(performance.now() - t0);
}

describe("query budgets on a 90-day seed fixture", () => {
  it("every primitive stays within its budget", async () => {
    const goal = { id: 1, kind: "event" as const, match: "signup" };
    const c = ctx();
    const cases: Record<string, () => Promise<unknown>> = {
      summary: () =>
        q.summary({
          ...c,
          compare: {
            from: new Date(c.range.from.getTime() - DAYS * 86_400_000),
            toExclusive: c.range.from,
          },
        }),
      timeseries_pageviews: () => q.timeseries(c, "pageviews", "day"),
      timeseries_sessions: () => q.timeseries(c, "sessions", "day"),
      breakdown_path: () => q.breakdown(c, "path", "pageviews", { limit: 50 }),
      breakdownMulti_path: () =>
        q.breakdownMulti(
          c,
          "path",
          ["pageviews", "visitors", "sessions", "bounce_rate", "engaged_time"],
          { limit: 50 }
        ),
      breakdownMulti_entry_channel_goals: () =>
        q.breakdownMulti(c, "entry_channel", [
          "visitors",
          "sessions",
          { kind: "goal_completions", goal },
          { kind: "conversion", goal },
        ]),
      breakdownMulti_matrix: () =>
        q.breakdownMulti(c, ["browser", "os"], ["visitors"], { limit: 100 }),
      breakdown_prop_key: () => q.breakdown(c, "prop_key", "custom_events"),
      realtime: () => q.realtime(c),
      pageFlow: () => q.pageFlow(c, "/pricing"),
      goalStats: () => q.goalStats(c, goal),
      funnel: () =>
        q.funnel(c, [
          { kind: "any" },
          { kind: "pageview", match: "/pricing" },
          { kind: "event", match: "signup" },
        ]),
      heatmap: () => q.heatmap(c, "country"),
      histogram: () =>
        q.histogram(c, "viewport_width", [0, 640, 1024, 1280, 1536, 2000]),
      pathsTo: () => q.pathsTo(c, "signup"),
      vitals: () => q.vitals(c),
      vitalsBreakdown: () => q.vitalsBreakdown(c, "path"),
      vitalsTimeseries: () => q.vitalsTimeseries(c, "day"),
      rows_sessions: () => q.rows(c, "sessions", { limit: 50 }),
    };
    const measured: Record<string, number> = {};
    for (const [name, fn] of Object.entries(cases))
      measured[name] = await timed(name, fn);
    const [{ n }] = await sql<
      { n: number }[]
    >`select count(*)::int as n from analytics.events where site_id = ${siteId}`;
    console.log(`budgets on ${n} rows (ms):`, JSON.stringify(measured));
    for (const [name, ms] of Object.entries(measured))
      expect(
        ms,
        `${name} took ${ms} ms, budget ${BUDGET[name]} ms`
      ).toBeLessThanOrEqual(BUDGET[name]);
  }, 120_000);
});

/**
 * Twelve months through the daily rollup (D-015, TICKET-049): the three
 * Overview tables on a 365-day fixture after housekeeping has rolled it.
 * Measured 2026-09-06 on 78,481 rows (365 days × 15 visitors/day, seed 5):
 * summary 10, timeseries by month 17, path 15, entry_channel with goal
 * columns 68, country 12; budgets keep headroom for the laptop's variance.
 */
const YEAR_BUDGET: Record<string, number> = {
  rollup_summary: 60,
  rollup_timeseries_visitors: 30,
  rollup_path: 70,
  rollup_entry_channel_goals: 100,
  rollup_country: 60,
};

describe("twelve-month budgets through the daily rollup", () => {
  let yearSite: number;
  const days = 365;
  beforeAll(async () => {
    const [site] = await sql<{ id: number }[]>`
      insert into public.websites (name, url, user_id, slug)
      values ('budget-year', 'budget-year.example', gen_random_uuid(), 'budget-year') returning id`;
    yearSite = Number(site.id);
    const out = generate({
      hostname: "budget-year.example",
      days,
      visitorsPerDay: 15,
      seed: 5,
      secret: "y",
      until,
      siteId: yearSite,
    });
    for (let i = 0; i < out.rows.length; i += 1000) {
      const chunk = out.rows
        .slice(i, i + 1000)
        .map((r) => ({ ...r, props: sql.json(r.props) })) as unknown as Record<
        string,
        unknown
      >[];
      await sql`insert into analytics.events ${sql(chunk, ...([...EVENT_COLUMNS] as string[]))}`;
    }
    await sql`analyze analytics.events`;
    await sql`select analytics.rollup_refresh(${new Date(until.getTime() - 2 * 86_400_000)}::date)`;
  }, 300_000);
  afterAll(async () => {
    await sql`delete from analytics.rollup_daily where site_id = ${yearSite}`;
    await sql`delete from analytics.rollup_state where site_id = ${yearSite}`;
    await sql`delete from analytics.events where site_id = ${yearSite}`;
    await sql`delete from public.websites where id = ${yearSite}`;
  });

  it("the Overview tables stay within budget at twelve months", async () => {
    const goal = { id: 1, kind: "event" as const, match: "signup" };
    const c: QueryContext = {
      siteId: yearSite,
      range: {
        from: new Date(until.getTime() - days * 86_400_000 + 4 * 3_600_000),
        toExclusive: until,
      },
      timezone: "America/Toronto",
      filters: [],
    };
    const cases: Record<string, () => Promise<unknown>> = {
      rollup_summary: () =>
        q.summary({
          ...c,
          compare: {
            from: new Date(c.range.from.getTime() - days * 86_400_000),
            toExclusive: c.range.from,
          },
        }),
      rollup_timeseries_visitors: () =>
        q.timeseries({ ...c, timezone: "UTC" }, "visitors", "month"),
      rollup_path: () =>
        q.breakdownMulti(
          c,
          "path",
          ["visitors", "pageviews", "bounce_rate", "engaged_time"],
          { limit: 50 }
        ),
      rollup_entry_channel_goals: () =>
        q.breakdownMulti(c, "entry_channel", [
          "visitors",
          "sessions",
          "bounce_rate",
          { kind: "goal_completions", goal },
          { kind: "conversion", goal },
        ]),
      rollup_country: () =>
        q.breakdownMulti(
          c,
          "country",
          ["visitors", "pageviews", "bounce_rate"],
          {
            limit: 50,
          }
        ),
    };
    const measured: Record<string, number> = {};
    for (const [name, fn] of Object.entries(cases))
      measured[name] = await timed(name, fn);
    const [{ n }] = await sql<
      { n: number }[]
    >`select count(*)::int as n from analytics.events where site_id = ${yearSite}`;
    console.log(
      `twelve-month budgets on ${n} rows (ms):`,
      JSON.stringify(measured)
    );
    for (const [name, ms] of Object.entries(measured))
      expect(
        ms,
        `${name} took ${ms} ms, budget ${YEAR_BUDGET[name]} ms`
      ).toBeLessThanOrEqual(YEAR_BUDGET[name]);
  }, 120_000);
});
