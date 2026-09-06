import { expect, request as playwrightRequest, test } from "@playwright/test";
import { APP_URL } from "./env.mjs";
import { E2E_KEY } from "./fixture";

// The keyed endpoints (D-017, D-019) answer to a key and nothing else, so
// these run in a request context with no cookies at all (TICKET-088): a
// session must not be needed, and the login proxy must not get in the way.
const HEADERS = {
  authorization: `Bearer ${E2E_KEY.token}`,
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
};
const rpc = (method: string, params: unknown = {}, id = 1) => ({
  jsonrpc: "2.0",
  id,
  method,
  params,
});

test.describe("without a session", () => {
  let api: Awaited<ReturnType<typeof playwrightRequest.newContext>>;
  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({ baseURL: APP_URL });
  });
  test.afterAll(async () => {
    await api.dispose();
  });

  test("mcp: initialises, lists the tools, and answers a summary", async () => {
    const init = await api.post("/api/mcp", {
      headers: HEADERS,
      data: rpc("initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "e2e", version: "0" },
      }),
    });
    expect(init.status()).toBe(200);
    expect(init.headers()["content-type"]).toContain("application/json");
    expect((await init.json()).result.serverInfo.name).toBe("lynq");

    const list = await api.post("/api/mcp", {
      headers: HEADERS,
      data: rpc("tools/list", {}, 2),
    });
    const names = (await list.json()).result.tools.map(
      (t: { name: string }) => t.name
    );
    expect(names).toEqual(
      expect.arrayContaining([
        "site",
        "summary",
        "breakdown",
        "bots",
        "add_note",
      ])
    );

    const call = await api.post("/api/mcp", {
      headers: HEADERS,
      data: rpc(
        "tools/call",
        { name: "summary", arguments: { range: "last_30d" } },
        3
      ),
    });
    expect(call.status()).toBe(200);
    const result = (await call.json()).result;
    expect(result.isError).toBeFalsy();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.summary).toMatch(/unique visitors/);
    expect(parsed.data.current.visitors).toBeGreaterThan(0);
  });

  test("mcp: refuses a wrong key, a key on a browser origin, and GET", async () => {
    const bad = await api.post("/api/mcp", {
      headers: { ...HEADERS, authorization: "Bearer lynq_sk_nope" },
      data: rpc("tools/list"),
    });
    expect(bad.status()).toBe(401);
    const origin = await api.post("/api/mcp", {
      headers: { ...HEADERS, origin: "https://evil.example" },
      data: rpc("tools/list"),
    });
    expect(origin.status()).toBe(403);
    const get = await api.get("/api/mcp", { headers: HEADERS });
    expect(get.status()).toBe(405);
  });

  test("bots and notes take a key the same way", async () => {
    // the e2e key has read and notes, not ingest: bots must say so, not redirect
    const bots = await api.post("/api/bots", {
      headers: HEADERS,
      data: [
        {
          ua: "Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)",
          path: "/docs",
        },
      ],
    });
    expect(bots.status()).toBe(403);
    expect((await bots.json()).error).toMatch(/ingest scope/);

    const note = await api.post("/api/notes", {
      headers: HEADERS,
      data: { text: "Pinned without a session", at: "2026-09-01T09:00:00Z" },
    });
    expect(note.status()).toBe(201);
    const { id } = await note.json();
    const gone = await api.delete(`/api/notes/${id}`, { headers: HEADERS });
    expect(gone.status()).toBe(204);
  });
});
