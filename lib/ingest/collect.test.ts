import { describe, expect, it, vi } from "vitest";
import { type CollectDeps, handleCollect } from "./collect";
import { batch, headers, SITE } from "./fixtures";

function deps(over: Partial<CollectDeps> = {}) {
  const inserted: unknown[][] = [];
  const logged: unknown[][] = [];
  const d: CollectDeps = {
    resolveSite: async (h) => (h === "aivia.byharsh.com" ? SITE : null),
    saltFor: async () => Buffer.alloc(32, 1),
    identitySecret: "secret",
    geo: () => ({ country: "CA", region: "MB", city: "Winnipeg" }),
    insert: async (rows) => {
      inserted.push(rows);
    },
    log: async (entries) => {
      logged.push(entries);
    },
    ...over,
  };
  return { d, inserted, logged };
}
const now = new Date();
const body = (over: Record<string, unknown> = {}) =>
  JSON.stringify(batch(over, now.getTime()));

describe("handleCollect", () => {
  it("rejects a missing Origin before anything else", async () => {
    const { d, logged } = deps();
    const r = await handleCollect(
      { headers: headers({ origin: "" }), body: body(), receivedAt: now },
      d
    );
    expect(r.status).toBe(400);
    expect(logged[0]?.[0]).toMatchObject({ stage: "origin_missing" });
  });
  it("rejects an oversized body", async () => {
    const { d } = deps();
    const r = await handleCollect(
      { headers: headers(), body: "x".repeat(33 * 1024), receivedAt: now },
      d
    );
    expect(r.status).toBe(400);
    expect(r.entries[0]).toMatchObject({ stage: "size" });
  });
  it("answers 202 and writes nothing for an unregistered site", async () => {
    const { d, inserted, logged } = deps();
    const r = await handleCollect(
      {
        headers: headers({ origin: "https://nope.example" }),
        body: body(),
        receivedAt: now,
      },
      d
    );
    expect(r.status).toBe(202);
    expect(inserted).toHaveLength(0);
    expect(logged[0]?.[0]).toMatchObject({
      stage: "unregistered",
      hostname: "nope.example",
    });
  });
  it("drops excluded IPs and bots silently", async () => {
    const site = {
      ...SITE,
      settings: { ...SITE.settings, excluded_ips: ["203.0.113.0/24"] },
    };
    const { d, inserted } = deps({ resolveSite: async () => site });
    const excluded = await handleCollect(
      { headers: headers(), body: body(), receivedAt: now },
      d
    );
    expect(excluded.entries[0]).toMatchObject({ stage: "excluded_ip" });
    const bot = deps();
    const r = await handleCollect(
      {
        headers: headers({ "user-agent": "Googlebot/2.1" }),
        body: body(),
        receivedAt: now,
      },
      bot.d
    );
    expect(r.entries[0]).toMatchObject({ stage: "bot" });
    expect(inserted).toHaveLength(0);
    expect(bot.inserted).toHaveLength(0);
  });
  it("rejects bad shapes and pages on other sites with 400", async () => {
    const { d } = deps();
    expect(
      (
        await handleCollect(
          { headers: headers(), body: "{not json", receivedAt: now },
          d
        )
      ).status
    ).toBe(400);
    expect(
      (
        await handleCollect(
          { headers: headers(), body: body({ sid: "short" }), receivedAt: now },
          d
        )
      ).status
    ).toBe(400);
    const other = await handleCollect(
      {
        headers: headers(),
        body: body({ page: { url: "https://other.example/x" } }),
        receivedAt: now,
      },
      d
    );
    expect(other.status).toBe(400);
    expect(other.entries[0]).toMatchObject({
      stage: "schema",
      detail: "page.url is not on this site",
    });
  });
  it("inserts the rows of a good batch with the anonymous visitor id", async () => {
    const { d, inserted, logged } = deps();
    const r = await handleCollect(
      { headers: headers(), body: body(), receivedAt: now },
      d
    );
    expect(r.status).toBe(202);
    expect(r.inserted).toBe(4);
    expect(inserted[0]).toHaveLength(4);
    expect(logged).toHaveLength(0);
    const row = inserted[0]?.[0] as { visitor_id: bigint; user_hash: bigint };
    expect(row.user_hash).toBe(BigInt(0));
    expect(typeof row.visitor_id).toBe("bigint");
  });
  it("uses the user hash as the visitor id after identify and remembers the raw id only when allowed", async () => {
    const remember = vi.fn(async () => {});
    const { d, inserted } = deps({ rememberUser: remember });
    await handleCollect(
      { headers: headers(), body: body({ uid: "user_123" }), receivedAt: now },
      d
    );
    const row = inserted[0]?.[0] as { visitor_id: bigint; user_hash: bigint };
    expect(row.user_hash).not.toBe(BigInt(0));
    expect(row.visitor_id).toBe(row.user_hash);
    expect(remember).not.toHaveBeenCalled();
    const allowed = deps({
      rememberUser: remember,
      resolveSite: async () => ({
        ...SITE,
        settings: { ...SITE.settings, store_user_ids: true },
      }),
    });
    await handleCollect(
      { headers: headers(), body: body({ uid: "user_123" }), receivedAt: now },
      allowed.d
    );
    expect(remember).toHaveBeenCalledWith(31, row.user_hash, "user_123");
  });
  it("still answers 202 when the insert fails, and logs it", async () => {
    const { d, logged } = deps({
      insert: async () => {
        throw new Error("db down");
      },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await handleCollect(
      { headers: headers(), body: body(), receivedAt: now },
      d
    );
    errorSpy.mockRestore();
    expect(r.status).toBe(202);
    expect(logged[0]?.[0]).toMatchObject({
      stage: "insert_failed",
      detail: "db down",
    });
  });
  it("flags a mismatched body site as suspect and logs it", async () => {
    const { d, inserted, logged } = deps();
    await handleCollect(
      {
        headers: headers(),
        body: body({ site: "other.example" }),
        receivedAt: now,
      },
      d
    );
    const first = inserted[0]?.[0] as { suspect: boolean } | undefined;
    expect(first?.suspect).toBe(true);
    expect(logged[0]?.[0]).toMatchObject({ stage: "site_mismatch" });
  });
});
