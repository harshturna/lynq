import { describe, expect, it } from "vitest";
import type { ResolvedKey } from "@/lib/api-keys";
import { type CrawlerDayRow, handleBots } from "./bots";

const KEY: ResolvedKey = {
  keyId: 7,
  siteId: 42,
  scopes: ["ingest"],
  name: "mw",
};
const READ_ONLY: ResolvedKey = {
  keyId: 8,
  siteId: 42,
  scopes: ["read"],
  name: "ro",
};
const TOKENS: Record<string, ResolvedKey> = {
  lynq_sk_good: KEY,
  lynq_sk_read: READ_ONLY,
};

const GOOGLEBOT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const GPTBOT =
  "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)";
const PERSON =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const NOW = new Date("2026-09-06T12:00:00Z");

function run(
  body: unknown,
  headers: Record<string, string> = { authorization: "Bearer lynq_sk_good" },
  allow?: (keyId: number) => boolean | Promise<boolean>
) {
  const upserts: CrawlerDayRow[][] = [];
  const h = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  const result = handleBots(
    {
      headers: { get: (n) => h.get(n.toLowerCase()) ?? null },
      body: typeof body === "string" ? body : JSON.stringify(body),
      receivedAt: NOW,
    },
    {
      resolveKey: async (t) => (t && TOKENS[t]) || null,
      upsert: async (rows) => {
        upserts.push(rows);
      },
      allow,
    }
  );
  return result.then((r) => ({ ...r, rows: upserts.flat() }));
}

describe("handleBots gates", () => {
  it("refuses a request that carries a browser origin, before looking at the key", async () => {
    const r = await run([], {
      authorization: "Bearer lynq_sk_good",
      origin: "https://example.com",
    });
    expect(r.status).toBe(403);
  });
  it("wants a known key with the ingest scope", async () => {
    expect((await run([], {})).status).toBe(401);
    expect(
      (await run([], { authorization: "Bearer lynq_sk_nope" })).status
    ).toBe(401);
    expect(
      (await run([], { authorization: "Basic lynq_sk_good" })).status
    ).toBe(401);
    expect(
      (await run([], { authorization: "Bearer lynq_sk_read" })).status
    ).toBe(403);
  });
  it("rejects a bad body without touching the store", async () => {
    expect((await run("{not json")).status).toBe(400);
    expect((await run({ ua: GOOGLEBOT })).status).toBe(400);
    expect(
      (await run(Array.from({ length: 51 }, () => ({ ua: GOOGLEBOT })))).status
    ).toBe(400);
    const big = await run([{ ua: "x".repeat(40_000) }]);
    expect(big.status).toBe(400);
    expect(big.rows).toEqual([]);
  });
  it("honours the limiter, sync or async", async () => {
    const r = await run([{ ua: GOOGLEBOT }], undefined, async () => false);
    expect(r.status).toBe(429);
    expect(r.rows).toEqual([]);
  });
});

describe("handleBots counting", () => {
  it("counts crawlers, drops people, folds the same day, crawler and path", async () => {
    const r = await run([
      { ua: GOOGLEBOT, path: "/docs?x=1", status: 200 },
      { ua: GOOGLEBOT, path: "/docs/", status: 304 },
      { ua: GOOGLEBOT, path: "/pricing", status: 200 },
      { ua: GPTBOT, path: "/robots.txt", status: 200 },
      { ua: PERSON, path: "/docs" },
      { ua: "", path: "/docs" },
    ]);
    expect(r.status).toBe(202);
    expect(r.accepted).toBe(4);
    expect(r.dropped).toBe(2);
    expect(
      r.rows.map((x) => [x.crawler, x.family, x.path, x.hits, x.last_status])
    ).toEqual([
      ["Googlebot", "search", "/docs", 2, 304],
      ["Googlebot", "search", "/pricing", 1, 200],
      ["GPTBot", "training", "robots.txt", 1, 200],
    ]);
    expect(
      r.rows.every((x) => x.site_id === 42 && x.day === "2026-09-06")
    ).toBe(true);
  });
  it("dates a hit from `at` when it is recent, else from arrival", async () => {
    const r = await run([
      { ua: GOOGLEBOT, path: "/", at: "2026-09-05T23:59:00Z" },
      { ua: GOOGLEBOT, path: "/", at: Date.parse("2026-09-06T00:01:00Z") },
      { ua: GOOGLEBOT, path: "/", at: "2020-01-01T00:00:00Z" },
      { ua: GOOGLEBOT, path: "/", at: "garbage" },
    ]);
    expect(r.rows.map((x) => [x.day, x.hits])).toEqual([
      ["2026-09-05", 1],
      ["2026-09-06", 3],
    ]);
  });
  it("accepts an empty batch and stores nothing", async () => {
    const r = await run([]);
    expect(r.status).toBe(202);
    expect(r.rows).toEqual([]);
  });
});
