import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ResolvedKey } from "@/lib/api-keys";
import { EVENT_COLUMNS } from "@/lib/ingest/rows";
import {
  CRAWLER_DAY_COLUMNS,
  generateCrawlerDays,
} from "../../scripts/seed/crawlers";
import { generate } from "../../scripts/seed/generate";
import { seedNotes } from "../../scripts/seed/notes";

/**
 * D-019: every tool answers from the seed fixture with the same numbers
 * lib/query gives, through the SDK's in-memory transport, so the schemas and
 * the adapters are exercised without HTTP.
 */
process.env.LYNQ_DB_POOLER_URL = process.env.TEST_DATABASE_URL;

const DAYS = 20;
const until = new Date("2026-09-06T12:00:00Z");
let sql: postgres.Sql;
let siteId: number;
let goalId: number;
let client: Client;
let key: ResolvedKey;
let q: typeof import("@/lib/query/run");
let ctxOf: typeof import("@/lib/query/authorize").buildContext;
let site: NonNullable<
  Awaited<ReturnType<typeof import("@/lib/agents/site").siteForKey>>
>;

type Result = { summary: string; data: Record<string, unknown> };
async function call(
  name: string,
  args: Record<string, unknown> = {}
): Promise<Result> {
  const r = (await client.callTool({ name, arguments: args })) as {
    isError?: boolean;
    content: { type: string; text: string }[];
  };
  if (r.isError) throw new Error(r.content[0]?.text);
  return JSON.parse(r.content[0].text) as Result;
}

beforeAll(async () => {
  sql = postgres(process.env.TEST_DATABASE_URL as string, {
    max: 1,
    prepare: false,
    types: { bigint: postgres.BigInt },
  });
  const [w] = await sql<{ id: number }[]>`
    insert into public.websites (name, url, user_id, slug)
    values ('agents', 'agents-test.example', gen_random_uuid(), 'agents-test') returning id`;
  siteId = Number(w.id);
  await sql`insert into analytics.site_hostnames (site_id, hostname) values (${siteId}, 'agents-test.example')`;
  const [g] = await sql<{ id: number }[]>`
    insert into public.goals (site_id, name, kind, match, target)
    values (${siteId}, 'Signup', 'event', 'signup', 100) returning id`;
  goalId = Number(g.id);
  await sql`insert into analytics.site_settings (site_id, timezone, kpi_goal_id)
    values (${siteId}, 'UTC', ${goalId})`;
  const { rows } = generate({
    siteId,
    hostname: "agents-test.example",
    days: DAYS,
    visitorsPerDay: 20,
    seed: 11,
    secret: "a",
    until,
  });
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows
      .slice(i, i + 1000)
      .map((r) => ({ ...r, props: sql.json(r.props) })) as unknown as Record<
      string,
      unknown
    >[];
    await sql`insert into analytics.events ${sql(chunk, ...([...EVENT_COLUMNS] as string[]))}`;
  }
  const crawlerRows = generateCrawlerDays({
    siteId,
    days: DAYS,
    seed: 11,
    until,
  });
  await sql`insert into analytics.crawler_days ${sql(crawlerRows as unknown as Record<string, unknown>[], ...([...CRAWLER_DAY_COLUMNS] as string[]))}`;
  await sql`insert into public.notes ${sql(seedNotes({ siteId, days: DAYS, until }), "site_id", "at", "text", "author")}`;
  const [k] = await sql<{ id: number }[]>`
    insert into analytics.api_keys (site_id, name, scopes, token_hash, prefix)
    values (${siteId}, 'Agent', ${["read", "notes"]}, ${Buffer.from("agents-test-hash")}, 'lynq_sk_agenttest') returning id`;
  key = {
    keyId: Number(k.id),
    siteId,
    scopes: ["read", "notes"],
    name: "Agent",
  };

  q = await import("@/lib/query/run");
  ctxOf = (await import("@/lib/query/authorize")).buildContext;
  const { siteForKey } = await import("@/lib/agents/site");
  const loaded = await siteForKey(key);
  if (!loaded) throw new Error("site not found");
  site = loaded;
  const { createAgentServer } = await import("@/lib/agents/tools");
  const server = createAgentServer(key, site);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  client = new Client({ name: "test", version: "0" });
  await client.connect(b);
}, 120_000);

afterAll(async () => {
  await client.close().catch(() => {});
  await sql`delete from analytics.events where site_id = ${siteId}`;
  await sql`delete from public.websites where id = ${siteId}`;
  const { sql: appSql } = await import("@/lib/db");
  await appSql.end();
  await sql.end();
});

const range = { from: "2026-08-20", to: "2026-09-05" };

describe("the agent tools", () => {
  it("list thirteen tools, every one with a description and a schema", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "add_note",
      "attention",
      "bots",
      "breakdown",
      "funnel",
      "goals",
      "notes",
      "paths",
      "realtime",
      "site",
      "summary",
      "timeseries",
      "vitals",
    ]);
    for (const t of tools) {
      expect(t.description?.length ?? 0).toBeGreaterThan(20);
      expect(t.inputSchema.type).toBe("object");
    }
  });

  it("site describes the site, its goals and what the tools accept", async () => {
    const r = await call("site");
    expect(r.data.url).toBe("agents-test.example");
    expect(r.data.goals).toEqual([
      expect.objectContaining({ id: goalId, name: "Signup", kpi: true }),
    ]);
    expect(r.data.dimensions).toContain("entry_channel");
    expect(r.summary).toContain("KPI Signup");
  });

  it("summary matches lib/query, with the previous period on request", async () => {
    const ctx = ctxOf(site, { range, compare: "previous_period" });
    const expected = await q.summary(ctx);
    const r = await call("summary", { range, compare: "previous_period" });
    const cur = r.data.current as Record<string, number>;
    expect(cur.visitors).toBe(expected.current.visitors);
    expect(cur.pageviews).toBe(expected.current.pageviews);
    expect((r.data.previous as Record<string, number>).visitors).toBe(
      expected.compare?.visitors
    );
    expect(r.summary).toMatch(/unique visitors/);
    expect(r.summary).toMatch(/on the period before/);
  });

  it("timeseries and breakdown take the dashboard's names and refuse others in a sentence", async () => {
    const ts = await call("timeseries", { metric: "pageviews", range });
    const points = ts.data.points as { bucket: string; value: number }[];
    expect(points).toHaveLength(17);
    const expected = await q.timeseries(
      ctxOf(site, { range }),
      "pageviews",
      "day"
    );
    expect(points.map((p) => p.value)).toEqual(expected.map((p) => p.value));

    const bd = await call("breakdown", {
      dimension: "path",
      metrics: ["visitors", "bounce_rate"],
      goal: goalId,
      limit: 5,
      range,
    });
    const rows = bd.data.rows as Record<string, unknown>[];
    expect(rows).toHaveLength(5);
    expect(Object.keys(rows[0])).toEqual(
      expect.arrayContaining([
        "value",
        "visitors",
        "bounce_rate",
        "goal_completions",
        "conversion",
      ])
    );
    expect(bd.summary).toMatch(/^\d[\d,]* path values/);

    await expect(
      call("breakdown", { dimension: "colour", range })
    ).rejects.toThrow(/Unknown dimension "colour"/);
    await expect(
      call("breakdown", { dimension: "path", goal: 999999, range })
    ).rejects.toThrow(/No goal with id 999999/);
    await expect(
      call("summary", { filters: [{ dimension: "colour", values: ["x"] }] })
    ).rejects.toThrow(/Unknown filter dimension/);
  });

  it("goals, funnel, paths and attention answer with the KPI in view", async () => {
    const g = await call("goals", { range });
    const rows = g.data.rows as Record<string, unknown>[];
    expect(rows[0]).toMatchObject({ name: "Signup", kpi: true });
    expect(typeof rows[0].completions).toBe("number");

    const f = await call("funnel", {
      steps: [
        { kind: "any" },
        { kind: "pageview", match: "/pricing" },
        { kind: "event", match: "signup" },
      ],
      range,
    });
    const steps = f.data.rows as { sessions: number; share: number }[];
    expect(steps).toHaveLength(3);
    expect(steps[0].share).toBe(100);
    expect(steps[1].sessions).toBeLessThanOrEqual(steps[0].sessions);
    await expect(
      call("funnel", { steps: [{ kind: "any" }, { kind: "event" }], range })
    ).rejects.toThrow(/needs a match/);

    const p = await call("paths", { event: "signup", range });
    expect((p.data.rows as unknown[]).length).toBeGreaterThan(0);

    const a = await call("attention", { range, limit: 5 });
    const pages = a.data.rows as {
      path: string;
      attention_share: number;
      influence: number | null;
    }[];
    expect(pages).toHaveLength(5);
    expect(a.data.kpi).toBe("Signup");
    expect(pages[0].attention_share).toBeGreaterThanOrEqual(
      pages[1].attention_share
    );
  });

  it("vitals, realtime, bots and notes are aggregates with a sentence", async () => {
    const v = await call("vitals", { range });
    expect(
      (v.data.metrics as { metric: string; band: string }[]).map(
        (m) => m.metric
      )
    ).toEqual(["lcp", "inp", "cls", "fcp", "ttfb"]);
    expect(v.summary).toMatch(/samples/);

    const r = await call("realtime");
    expect(Object.keys(r.data)).not.toContain("events");
    expect(typeof r.data.visitors_now).toBe("number");

    const b = await call("bots", { range, family: "answers" });
    expect(
      (b.data.crawlers as { family: string }[]).every(
        (c) => c.family === "answers"
      )
    ).toBe(true);
    expect(b.summary).toMatch(/to answer someone/);

    const n = await call("notes", {
      range: { from: "2026-08-17", to: "2026-09-06" },
    });
    expect((n.data.rows as { text: string }[]).map((x) => x.text)).toContain(
      "Launched on Product Hunt"
    );
  });

  it("add_note pins a note signed with the key, and a read-only key is refused", async () => {
    const r = await call("add_note", {
      text: "Deployed from the test",
      at: "2026-09-01T10:00:00Z",
    });
    expect(r.summary).toContain("Deployed from the test");
    const [row] = await sql<
      { author: string }[]
    >`select author from public.notes where id = ${Number(r.data.id)}`;
    expect(row.author).toBe("key:Agent");

    const { createAgentServer } = await import("@/lib/agents/tools");
    const ro = createAgentServer({ ...key, scopes: ["read"] }, site);
    const [a, b] = InMemoryTransport.createLinkedPair();
    await ro.connect(a);
    const roClient = new Client({ name: "ro", version: "0" });
    await roClient.connect(b);
    const res = (await roClient.callTool({
      name: "add_note",
      arguments: { text: "x" },
    })) as { isError?: boolean; content: { text: string }[] };
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toMatch(/notes scope/);
    await roClient.close();
  });
});
