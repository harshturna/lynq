import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EVENT_COLUMNS } from "@/lib/ingest/rows";
import { breakdownMultiQuery, type MetricSpec } from "@/lib/query/breakdown";
import { type QueryContext, summaryQueries } from "@/lib/query/primitives";
import {
  ROLLUP_DIMENSIONS,
  rollupApplies,
  rollupBreakdownQuery,
} from "@/lib/query/rollup";
import { generate } from "../../scripts/seed/generate";

/**
 * D-015: the rollup read path must give the same rows as the events scan.
 * The seed fixture has anonymous visitors, identified users who return
 * across days, custom events and a site timezone whose midnights are not
 * UTC's, so every branch of the read path (rolled days, the partial days at
 * both ends, the identified count, the goal columns) carries real rows.
 */
process.env.LYNQ_DB_POOLER_URL = process.env.TEST_DATABASE_URL;

let sql: postgres.Sql;
let siteId: number;
let q: typeof import("@/lib/query/run");
const until = new Date("2026-09-05T15:30:00Z");
const DAYS = 12;

const METRICS: MetricSpec[] = [
  "visitors",
  "revenue",
  "payments",
  "pageviews",
  "custom_events",
  "sessions",
  "bounce_rate",
  "engaged_time",
  "pages_per_session",
  "time_on_site",
];
const goal = { id: 1, kind: "event" as const, match: "signup" };
const WITH_GOAL: MetricSpec[] = [
  "visitors",
  "sessions",
  { kind: "goal_completions", goal },
  { kind: "conversion", goal },
];

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
    types: { bigint: postgres.BigInt },
  });
  const [site] = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('rollup', 'rollup-test.example', gen_random_uuid(), 'rollup-test') returning id`;
  siteId = Number(site.id);
  const out = generate({
    hostname: "rollup-test.example",
    days: DAYS,
    visitorsPerDay: 30,
    seed: 11,
    secret: "r",
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
  // A session that straddles UTC midnight is one session to the events scan
  // and two to the rollup (D-015). An anonymous id cannot straddle it in
  // production (the id rotates at midnight); an identified one can, and is
  // the documented approximation. Drop them here so the comparison is exact.
  await sql`delete from analytics.events e using (
      select visitor_id, session_id from analytics.events
      where site_id = ${siteId} group by 1, 2
      having (min(ts) at time zone 'UTC')::date <> (max(ts) at time zone 'UTC')::date) x
    where e.site_id = ${siteId} and e.visitor_id = x.visitor_id and e.session_id = x.session_id`;
  await sql`analyze analytics.events`;
  q = await import("@/lib/query/run");
});
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
    // local midnights at 04:00 UTC, so the range edges are partial UTC days
    range: {
      from: new Date("2026-08-25T04:00:00Z"),
      toExclusive: until,
    },
    timezone: "America/Toronto",
    filters: [],
    ...over,
  };
}

type Row = Record<string, unknown>;
async function both(
  c: QueryContext,
  dimension: string,
  metrics: MetricSpec[]
): Promise<{ raw: Row[]; rolled: Row[] }> {
  expect(rollupApplies(c, dimension, metrics)).toBe(true);
  const opts = { limit: 1000 };
  const raw = await q.run<Row>(
    breakdownMultiQuery(c, dimension, metrics, opts)
  );
  const rolled = await q.run<Row>(
    rollupBreakdownQuery(c, dimension, metrics, opts)
  );
  return { raw, rolled };
}

async function expectEqualEverywhere(label: string) {
  for (const dimension of ROLLUP_DIMENSIONS) {
    if (dimension === "site") continue; // the site total has no raw breakdown; see the summary case
    const { raw, rolled } = await both(ctx(), dimension, METRICS);
    if (
      !dimension.startsWith("entry_utm_t") &&
      dimension !== "entry_utm_content"
    )
      expect(raw.length, `${label}: ${dimension} has rows`).toBeGreaterThan(0);
    expect(rolled, `${label}: ${dimension}`).toEqual(raw);
  }
  for (const dimension of ["path", "entry_channel", "country"]) {
    const { raw, rolled } = await both(ctx(), dimension, WITH_GOAL);
    expect(rolled, `${label}: ${dimension} with goal columns`).toEqual(raw);
  }
  // the summary reads the 'site' total; compare against the two raw statements
  const c = ctx({
    compare: {
      from: new Date("2026-08-20T04:00:00Z"),
      toExclusive: new Date("2026-08-25T04:00:00Z"),
    },
  });
  const viaRollup = await q.summary(c);
  for (const [w, got] of [
    [c.range, viaRollup.current],
    [c.compare, viaRollup.compare],
  ] as const) {
    const { rows, sessions } = summaryQueries(c, w as typeof c.range);
    const [r] = await q.run<Record<string, number>>(rows);
    const [s] = await q.run<Record<string, number>>(sessions);
    const raw: Record<string, number> = {};
    for (const [k, v] of Object.entries({ ...r, ...s })) raw[k] = Number(v);
    expect(got, `${label}: summary`).toEqual(raw);
  }
}

describe("daily rollup (D-015)", () => {
  it("routes only the breakdowns it can answer", () => {
    const c = ctx();
    expect(rollupApplies(c, "path", METRICS)).toBe(true);
    expect(rollupApplies(c, ["browser", "os"], ["visitors"])).toBe(false);
    expect(rollupApplies(c, "event_name", ["visitors"])).toBe(false);
    expect(rollupApplies(c, "path", ["visitors", "last_seen"])).toBe(false);
    expect(rollupApplies(c, "path", ["visitors"], { propKey: "plan" })).toBe(
      false
    );
    expect(
      rollupApplies(
        ctx({ filters: [{ dimension: "country", op: "is", values: ["CA"] }] }),
        "path",
        ["visitors"]
      )
    ).toBe(false);
    expect(
      rollupApplies(ctx({ includeSuspect: true }), "path", ["visitors"])
    ).toBe(false);
    // a range inside one UTC day has nothing rolled to read
    expect(
      rollupApplies(
        ctx({
          range: {
            from: new Date("2026-09-04T04:00:00Z"),
            toExclusive: new Date("2026-09-04T23:00:00Z"),
          },
        }),
        "path",
        ["visitors"]
      )
    ).toBe(false);
  });

  it("matches the events scan before anything is rolled", async () => {
    await expectEqualEverywhere("unrolled");
  });

  it("matches with the range partly rolled", async () => {
    await sql`select analytics.rollup_refresh(date '2026-08-30')`;
    const [state] = await sql<
      { rolled_through: Date }[]
    >`select rolled_through from analytics.rollup_state where site_id = ${siteId}`;
    expect(state.rolled_through).toEqual(new Date("2026-08-30T00:00:00Z"));
    await expectEqualEverywhere("partly rolled");
  });

  it("matches fully rolled, and the refresh is idempotent", async () => {
    await sql`select analytics.rollup_refresh(date '2026-09-05')`;
    const count = async () =>
      (
        await sql<
          { n: number }[]
        >`select count(*)::int as n from analytics.rollup_daily where site_id = ${siteId}`
      )[0].n;
    const n = await count();
    expect(n).toBeGreaterThan(0);
    await sql`select analytics.rollup_refresh(date '2026-09-05')`;
    expect(await count()).toBe(n);
    await expectEqualEverywhere("rolled");
  });

  it("breakdownMulti reads through the rollup with the same result shape", async () => {
    const c = ctx();
    const viaRun = await q.breakdownMulti(c, "path", METRICS, { limit: 5 });
    const raw = await q.run<Row>(
      breakdownMultiQuery(c, "path", METRICS, { limit: 5 })
    );
    expect(viaRun.rows.map((r) => r.value)).toEqual(raw.map((r) => r.value));
    expect(viaRun.total).toBe(Number(raw[0]?.total));
  });

  it("housekeeping rolls up to two days ago and trims with retention", async () => {
    await sql`delete from analytics.rollup_state where site_id = ${siteId}`;
    await sql`insert into analytics.rollup_daily
      (site_id, day, dimension, value, visitors, pageviews, custom_events, sessions, bounced, engaged_ms, session_pageviews, time_on_site_ms)
      values (${siteId}, current_date - 800, 'path', '/old', 1, 1, 0, 1, 0, 0, 1, 0)`;
    await sql`select analytics.housekeeping()`;
    const [state] = await sql<
      { rolled_through: Date }[]
    >`select rolled_through from analytics.rollup_state where site_id = ${siteId}`;
    const [{ today }] = await sql<
      { today: Date }[]
    >`select current_date as today`;
    expect(state.rolled_through.getTime()).toBe(
      today.getTime() - 2 * 86_400_000
    );
    const [{ old }] = await sql<
      { old: number }[]
    >`select count(*)::int as old from analytics.rollup_daily where site_id = ${siteId} and value = '/old'`;
    expect(old).toBe(0);
  });
});
