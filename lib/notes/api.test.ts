import { describe, expect, it } from "vitest";
import type { ResolvedKey } from "@/lib/api-keys";
import { handleCreateNote, handleDeleteNote } from "./api";

const KEY: ResolvedKey = {
  keyId: 1,
  siteId: 42,
  scopes: ["notes"],
  name: "Deploy pipeline",
};
const READ: ResolvedKey = {
  keyId: 2,
  siteId: 42,
  scopes: ["read"],
  name: "ro",
};
const TOKENS: Record<string, ResolvedKey> = {
  lynq_sk_notes: KEY,
  lynq_sk_read: READ,
};
const NOW = new Date("2026-09-06T12:00:00Z");

function run(
  body: unknown,
  headers: Record<string, string> = { authorization: "Bearer lynq_sk_notes" },
  opts: { allow?: () => boolean; removed?: boolean } = {}
) {
  const inserted: unknown[] = [];
  const removed: [number, number][] = [];
  const h = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
  );
  const req = {
    headers: { get: (n: string) => h.get(n.toLowerCase()) ?? null },
    body: typeof body === "string" ? body : JSON.stringify(body),
    receivedAt: NOW,
  };
  const deps = {
    resolveKey: async (t: string | null) => (t && TOKENS[t]) || null,
    insert: async (n: unknown) => {
      inserted.push(n);
      return { id: 7 };
    },
    remove: async (siteId: number, id: number) => {
      removed.push([siteId, id]);
      return opts.removed ?? true;
    },
    allow: opts.allow,
  };
  return { req, deps, inserted, removed };
}

describe("handleCreateNote", () => {
  it("pins a note signed with the key's name", async () => {
    const { req, deps, inserted } = run({
      text: " Deployed v2 ",
      at: "2026-09-05T09:30:00Z",
    });
    const r = await handleCreateNote(req, deps);
    expect(r).toEqual({ status: 201, id: 7, at: "2026-09-05T09:30:00.000Z" });
    expect(inserted).toEqual([
      {
        siteId: 42,
        at: new Date("2026-09-05T09:30:00Z"),
        text: "Deployed v2",
        author: "key:Deploy pipeline",
      },
    ]);
  });
  it("defaults the instant to arrival", async () => {
    const { req, deps } = run({ text: "Deployed" });
    expect(await handleCreateNote(req, deps)).toMatchObject({
      at: NOW.toISOString(),
    });
  });
  it("refuses a browser origin, an unknown key, the wrong scope, and the limiter", async () => {
    expect(
      (
        await handleCreateNote(
          ...args(
            run(
              { text: "x" },
              {
                authorization: "Bearer lynq_sk_notes",
                origin: "https://a.example",
              }
            )
          )
        )
      ).status
    ).toBe(403);
    expect(
      (await handleCreateNote(...args(run({ text: "x" }, {})))).status
    ).toBe(401);
    expect(
      (
        await handleCreateNote(
          ...args(run({ text: "x" }, { authorization: "Bearer lynq_sk_read" }))
        )
      ).status
    ).toBe(403);
    expect(
      (
        await handleCreateNote(
          ...args(run({ text: "x" }, undefined, { allow: () => false }))
        )
      ).status
    ).toBe(429);
  });
  it("rejects a bad body with the validation message", async () => {
    expect(await handleCreateNote(...args(run("{nope")))).toMatchObject({
      status: 400,
      error: "invalid json",
    });
    expect(await handleCreateNote(...args(run([1])))).toMatchObject({
      status: 400,
    });
    expect(await handleCreateNote(...args(run({ text: "" })))).toMatchObject({
      status: 400,
      error: "Write the note first.",
    });
    expect(
      await handleCreateNote(...args(run({ text: "x", at: "someday" })))
    ).toMatchObject({ status: 400 });
    const { req, deps, inserted } = run({ text: "a".repeat(5000) });
    expect((await handleCreateNote(req, deps)).status).toBe(400);
    expect(inserted).toEqual([]);
  });
});

describe("handleDeleteNote", () => {
  it("removes the site's own note and says when there is none", async () => {
    const ok = run("", undefined);
    expect(await handleDeleteNote(ok.req, 12, ok.deps)).toEqual({
      status: 204,
    });
    expect(ok.removed).toEqual([[42, 12]]);
    const gone = run("", undefined, { removed: false });
    expect((await handleDeleteNote(gone.req, 12, gone.deps)).status).toBe(404);
    expect(
      (await handleDeleteNote(gone.req, Number.NaN, gone.deps)).status
    ).toBe(404);
    const noScope = run("", { authorization: "Bearer lynq_sk_read" });
    expect((await handleDeleteNote(noScope.req, 12, noScope.deps)).status).toBe(
      403
    );
  });
});

function args(
  r: ReturnType<typeof run>
): [ReturnType<typeof run>["req"], ReturnType<typeof run>["deps"]] {
  return [r.req, r.deps];
}
