import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateToken, hashToken } from "@/lib/api-keys";

/** TICKET-086: the per-key counter is shared, so the 121st request in a minute is refused wherever it lands. */
process.env.LYNQ_DB_POOLER_URL = process.env.TEST_DATABASE_URL;

let sql: postgres.Sql;
let siteId: number;
let keyId: number;
let keys: typeof import("@/lib/api-keys");

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
  });
  const [site] = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('limit', 'limit-test.example', gen_random_uuid(), 'limit-test') returning id`;
  siteId = Number(site.id);
  const t = generateToken();
  const [key] = await sql<{ id: number }[]>`
    insert into analytics.api_keys (site_id, name, scopes, token_hash, prefix)
    values (${siteId}, 'limited', ${["ingest"]}, ${hashToken(t.token)}, ${t.prefix}) returning id`;
  keyId = Number(key.id);
  keys = await import("@/lib/api-keys");
});

afterAll(async () => {
  await sql`delete from public.websites where id = ${siteId}`;
  const { sql: appSql } = await import("@/lib/db");
  await appSql.end();
  await sql.end();
});

describe("allowKey", () => {
  it("allows the cap, refuses the next, and a new minute resets", async () => {
    const cap = 5;
    const answers: boolean[] = [];
    for (let i = 0; i < cap + 2; i++)
      answers.push(await keys.allowKey(keyId, cap));
    expect(answers).toEqual([true, true, true, true, true, false, false]);
    // the count lives in the table, where every instance reads it
    const [row] = await sql<{ n: number }[]>`
      select n from analytics.api_key_windows where key_id = ${keyId}`;
    expect(Number(row.n)).toBe(cap + 2);
    // a minute ago, as far as the row is concerned, so the next request starts a fresh window
    await sql`update analytics.api_key_windows set window_start = window_start - interval '1 minute' where key_id = ${keyId}`;
    expect(await keys.allowKey(keyId, cap)).toBe(true);
    const [fresh] = await sql<{ n: number }[]>`
      select n from analytics.api_key_windows where key_id = ${keyId}`;
    expect(Number(fresh.n)).toBe(1);
  });

  it("goes with the key", async () => {
    await sql`delete from analytics.api_keys where id = ${keyId}`;
    const rows =
      await sql`select 1 from analytics.api_key_windows where key_id = ${keyId}`;
    expect(rows).toHaveLength(0);
  });
});
