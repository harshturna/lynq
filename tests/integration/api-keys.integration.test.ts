import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateToken, hashToken } from "@/lib/api-keys";

/** D-017: a key resolves to its site and scopes, and a revoked one to nothing. */
process.env.LYNQ_DB_POOLER_URL = process.env.TEST_DATABASE_URL;

let sql: postgres.Sql;
let siteId: number;
let keys: typeof import("@/lib/api-keys");
const live = generateToken();
const dead = generateToken();

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
  });
  const [site] = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('keys', 'keys-test.example', gen_random_uuid(), 'keys-test') returning id`;
  siteId = Number(site.id);
  await sql`
    insert into analytics.api_keys (site_id, name, scopes, token_hash, prefix)
    values (${siteId}, 'live', ${["read", "notes"]}, ${hashToken(live.token)}, ${live.prefix}),
           (${siteId}, 'dead', ${["ingest"]}, ${hashToken(dead.token)}, ${dead.prefix})`;
  await sql`update analytics.api_keys set revoked_at = now() where prefix = ${dead.prefix}`;
  keys = await import("@/lib/api-keys");
});

afterAll(async () => {
  await sql`delete from public.websites where id = ${siteId}`;
  const { sql: appSql } = await import("@/lib/db");
  await appSql.end();
  await sql.end();
});

describe("resolveApiKey", () => {
  it("resolves a live key to its site and scopes", async () => {
    const r = await keys.resolveApiKey(live.token);
    expect(r?.siteId).toBe(siteId);
    expect(r?.scopes.sort()).toEqual(["notes", "read"]);
    expect(keys.hasScope(r as never, "read")).toBe(true);
    expect(keys.hasScope(r as never, "ingest")).toBe(false);
  });

  it("refuses a revoked key, an unknown one and rubbish", async () => {
    expect(await keys.resolveApiKey(dead.token)).toBeNull();
    expect(await keys.resolveApiKey(generateToken().token)).toBeNull();
    expect(await keys.resolveApiKey("not-a-key")).toBeNull();
    expect(await keys.resolveApiKey("")).toBeNull();
    expect(await keys.resolveApiKey(null)).toBeNull();
  });

  it("stores no token, only its hash", async () => {
    const rows = await sql<{ all: string }[]>`
      select coalesce(string_agg(t.v, ' '), '') as all
      from analytics.api_keys k,
        lateral (values (k.name), (k.prefix), (array_to_string(k.scopes, ','))) as t(v)
      where k.site_id = ${siteId}`;
    expect(rows[0].all).not.toContain(live.token);
    expect(rows[0].all).toContain(live.prefix);
  });

  it("scopes are constrained to the three the product has", async () => {
    await expect(
      sql`insert into analytics.api_keys (site_id, name, scopes, token_hash, prefix)
          values (${siteId}, 'bad', ${["admin"]}, ${hashToken("x")}, 'x')`
    ).rejects.toThrow();
  });
});
