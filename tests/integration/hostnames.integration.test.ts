import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { HOSTNAME_CASES } from "@/lib/ingest/hostnames.cases";

let sql: postgres.Sql;
beforeAll(() => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
  });
});
afterAll(() => sql.end());

describe("analytics.normalise_hostname and seed_hostnames", () => {
  it("agrees with the TypeScript normaliser on every case", async () => {
    for (const [input, expected] of HOSTNAME_CASES) {
      const [{ h }] = await sql<
        { h: string | null }[]
      >`select analytics.normalise_hostname(${input}) as h`;
      expect(h, input).toBe(expected);
    }
  });
  it("seeds one hostname per website and is re-runnable", async () => {
    const [site] = await sql<{ id: number }[]>`
      insert into public.websites (name, url, user_id, slug)
      values ('seed', 'https://WWW.Seed-Test.example/', gen_random_uuid(), 'seed-test-example') returning id`;
    const [{ n1 }] = await sql<
      { n1: number }[]
    >`select analytics.seed_hostnames() as n1`;
    const [{ n2 }] = await sql<
      { n2: number }[]
    >`select analytics.seed_hostnames() as n2`;
    expect(n1).toBe(1);
    expect(n2).toBe(0);
    const rows = await sql<
      { hostname: string }[]
    >`select hostname from analytics.site_hostnames where site_id = ${site.id}`;
    expect(rows.map((r) => r.hostname)).toEqual(["seed-test.example"]);
    await sql`delete from public.websites where id = ${site.id}`;
  });
});
