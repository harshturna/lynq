import { expect, test } from "@playwright/test";
import { E2E_KEY } from "./fixture";

// The MCP endpoint (D-019): stateless JSON-RPC over HTTP with a read key;
// a refused key, a browser origin, and one real answer.
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

test("initialises, lists the tools, and answers a summary", async ({
  request,
}) => {
  const init = await request.post("/api/mcp", {
    headers: HEADERS,
    data: rpc("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "e2e", version: "0" },
    }),
  });
  expect(init.status()).toBe(200);
  const initBody = await init.json();
  expect(initBody.result.serverInfo.name).toBe("lynq");

  const list = await request.post("/api/mcp", {
    headers: HEADERS,
    data: rpc("tools/list", {}, 2),
  });
  expect(list.status()).toBe(200);
  const names = (await list.json()).result.tools.map(
    (t: { name: string }) => t.name
  );
  expect(names).toEqual(
    expect.arrayContaining(["site", "summary", "breakdown", "bots", "add_note"])
  );

  const call = await request.post("/api/mcp", {
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

test("refuses a wrong key, a key on a browser origin, and GET", async ({
  request,
}) => {
  const bad = await request.post("/api/mcp", {
    headers: { ...HEADERS, authorization: "Bearer lynq_sk_nope" },
    data: rpc("tools/list"),
  });
  expect(bad.status()).toBe(401);
  const origin = await request.post("/api/mcp", {
    headers: { ...HEADERS, origin: "https://evil.example" },
    data: rpc("tools/list"),
  });
  expect(origin.status()).toBe(403);
  const get = await request.get("/api/mcp", { headers: HEADERS });
  expect(get.status()).toBe(405);
});
