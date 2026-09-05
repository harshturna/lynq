import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { batch, headers } from "@/lib/ingest/fixtures";

// The real pipeline against the real database: site resolution, salt, insert, log, identify.
process.env.LYNQ_DB_POOLER_URL = process.env.TEST_DATABASE_URL;

let sql: postgres.Sql;
let siteId: number;
let deps: Awaited<ReturnType<typeof makeDeps>>;

async function makeDeps() {
  const { handleCollect } = await import("@/lib/ingest/collect");
  const { insertEvents, logIngest, rememberUser } = await import(
    "@/lib/ingest/db-deps"
  );
  const { loadSaltFromDatabase } = await import("@/lib/ingest/salts");
  const { loadSiteFromDatabase } = await import("@/lib/ingest/sites");
  const { getGeoCodesFromHeaders } = await import("@/lib/geo/request-geo");
  const { createSaltCache } = await import("@/lib/ingest/salt-cache");
  const { createSiteResolver } = await import("@/lib/ingest/site-resolution");
  return {
    handleCollect,
    collectDeps: {
      resolveSite: createSiteResolver(loadSiteFromDatabase, 0),
      saltFor: createSaltCache(loadSaltFromDatabase),
      identitySecret: "integration-secret",
      geo: getGeoCodesFromHeaders,
      insert: insertEvents,
      log: logIngest,
      rememberUser,
    },
  };
}

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
  });
  const [site] = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('collect', 'aivia.byharsh.com', gen_random_uuid(), 'collect-test') returning id`;
  siteId = Number(site.id);
  await sql`insert into analytics.site_hostnames (site_id, hostname)
    values (${siteId}, 'aivia.byharsh.com'), (${siteId}, 'app.aivia.byharsh.com')`;
  deps = await makeDeps();
});
afterAll(async () => {
  await sql`delete from public.websites where id = ${siteId}`;
  await sql`delete from analytics.ingest_log`;
  await sql`delete from analytics.visitor_salts`;
  const { sql: appSql } = await import("@/lib/db");
  await appSql.end();
  await sql.end();
});

describe("collect against the database", () => {
  it("writes the rows of a batch and a salt for the day", async () => {
    const now = new Date();
    const r = await deps.handleCollect(
      {
        headers: headers(),
        body: JSON.stringify(batch({}, now.getTime())),
        receivedAt: now,
      },
      deps.collectDeps
    );
    expect(r.status).toBe(202);
    expect(r.inserted).toBe(4);
    const rows = await sql<
      {
        event: string;
        path: string;
        channel: string;
        country: string;
        lcp: number | null;
        props: Record<string, string>;
      }[]
    >`select event, path, channel, country, lcp, props from analytics.events where site_id = ${siteId} order by seq`;
    expect(rows.map((r) => r.event)).toEqual([
      "pageview",
      "custom",
      "engagement",
      "vitals",
    ]);
    expect(rows[0]).toMatchObject({
      path: "/pricing",
      channel: "Email",
      country: "CA",
    });
    expect(rows[1]?.props).toEqual({ plan: "pro", revenue: "4900" });
    expect(rows[3]?.lcp).toBe(1834);
    const [{ salts }] = await sql<
      { salts: number }[]
    >`select count(*)::int as salts from analytics.visitor_salts`;
    expect(salts).toBe(1);
  });
  it("logs an unregistered hostname and writes nothing", async () => {
    const now = new Date();
    await deps.handleCollect(
      {
        headers: headers({ origin: "https://nope.example" }),
        body: JSON.stringify(batch({}, now.getTime())),
        receivedAt: now,
      },
      deps.collectDeps
    );
    const [log] = await sql<{ stage: string; hostname: string }[]>`
      select stage, hostname from analytics.ingest_log where hostname = 'nope.example'`;
    expect(log).toMatchObject({ stage: "unregistered" });
  });
  it("remembers a raw user id only when the site opted in", async () => {
    const now = new Date();
    const request = () => ({
      headers: headers(),
      body: JSON.stringify(batch({ uid: "u1" }, now.getTime())),
      receivedAt: now,
    });
    await deps.handleCollect(request(), deps.collectDeps);
    let [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from analytics.identified_users where site_id = ${siteId}`;
    expect(n).toBe(0);
    await sql`insert into analytics.site_settings (site_id, store_user_ids) values (${siteId}, true)`;
    await deps.handleCollect(request(), deps.collectDeps);
    [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from analytics.identified_users where site_id = ${siteId} and user_id = 'u1'`;
    expect(n).toBe(1);
  });
});
