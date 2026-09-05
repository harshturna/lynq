import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Proves the analytics migration applied from empty and that the pieces the
// design relies on behave: grants, the housekeeping function, the constraints.

let sql: postgres.Sql;
beforeAll(() => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
  });
});
afterAll(() => sql.end());

describe("analytics schema", () => {
  it("has the events table, its three indexes, and the supporting tables", async () => {
    const tables = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables where table_schema = 'analytics' order by 1`;
    expect(tables.map((t) => t.table_name)).toEqual([
      "events",
      "identified_users",
      "ingest_log",
      "site_hostnames",
      "site_settings",
      "visitor_salts",
    ]);
    const indexes = await sql<{ indexname: string }[]>`
      select indexname from pg_indexes where schemaname = 'analytics' and tablename = 'events' order by 1`;
    expect(indexes.map((i) => i.indexname)).toEqual([
      "events_custom_name",
      "events_pkey",
      "events_site_session",
      "events_site_ts",
    ]);
  });

  it("has no v1 tables, RPC or counter column left in public (TICKET-024)", async () => {
    const tables = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables where table_schema = 'public' order by 1`;
    expect(tables.map((t) => t.table_name)).toEqual(["websites"]);
    const [{ n: fns }] = await sql<{ n: number }[]>`
      select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'get_period_summary'`;
    expect(fns).toBe(0);
    const columns = await sql<{ column_name: string }[]>`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'websites' and column_name = 'visitors'`;
    expect(columns).toHaveLength(0);
  });

  it("rejects an unknown event type and accepts a minimal pageview", async () => {
    const [site] = await sql<{ id: number }[]>`
      insert into public.websites (name, url, user_id, slug)
      values ('t', 'schema-test.example', gen_random_uuid(), 'schema-test-example')
      returning id`;
    const row = {
      site_id: site.id,
      ts: new Date(),
      event: "pageview",
      visitor_id: 1,
      session_id: 2,
      pageview_id: 3,
      hostname: "schema-test.example",
      path: "/",
      ingest_version: 2,
    };
    await expect(
      sql`insert into analytics.events ${sql({ ...row, event: "bogus" })}`
    ).rejects.toThrow(/check constraint/);
    await sql`insert into analytics.events ${sql(row)}`;
    const [{ n }] = await sql<
      { n: number }[]
    >`select count(*)::int as n from analytics.events where site_id = ${site.id}`;
    expect(n).toBe(1);
    await sql`delete from public.websites where id = ${site.id}`;
  });

  it("housekeeping removes only what it should", async () => {
    const [site] = await sql<{ id: number }[]>`
      insert into public.websites (name, url, user_id, slug)
      values ('hk', 'hk-test.example', gen_random_uuid(), 'hk-test-example') returning id`;
    const base = {
      site_id: site.id,
      event: "pageview",
      visitor_id: 1,
      session_id: 2,
      pageview_id: 3,
      hostname: "hk-test.example",
      path: "/",
      ingest_version: 2,
    };
    await sql`insert into analytics.events ${sql([
      { ...base, ts: new Date(Date.now() - 25 * 30 * 24 * 3600 * 1000) }, // older than 24 months
      { ...base, ts: new Date() },
    ])}`;
    await sql`insert into analytics.visitor_salts (day, salt) values (current_date - 5, '\\x00'), (current_date, '\\x00')`;
    await sql`select analytics.housekeeping()`;
    const [{ events }] = await sql<
      { events: number }[]
    >`select count(*)::int as events from analytics.events where site_id = ${site.id}`;
    const [{ salts }] = await sql<
      { salts: number }[]
    >`select count(*)::int as salts from analytics.visitor_salts`;
    expect(events).toBe(1);
    expect(salts).toBe(1);
    // soft delete: events go first, then the row on a later run
    await sql`update public.websites set deleted_at = now() where id = ${site.id}`;
    await sql`select analytics.housekeeping()`;
    const [{ left }] = await sql<
      { left: number }[]
    >`select count(*)::int as left from analytics.events where site_id = ${site.id}`;
    expect(left).toBe(0);
    await sql`select analytics.housekeeping()`;
    const [{ rows }] = await sql<
      { rows: number }[]
    >`select count(*)::int as rows from public.websites where id = ${site.id}`;
    expect(rows).toBe(0);
    await sql`delete from analytics.visitor_salts`;
  });

  it("set local statement_timeout is scoped to its transaction", async () => {
    const inside = await sql.begin(async (tx) => {
      await tx.unsafe("set local statement_timeout = 2000");
      const [r] = await tx<
        { st: string }[]
      >`select current_setting('statement_timeout') as st`;
      return r.st;
    });
    const [after] = await sql<
      { st: string }[]
    >`select current_setting('statement_timeout') as st`;
    expect(inside).toBe("2s");
    expect(after.st).not.toBe("2s");
  });
});
