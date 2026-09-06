import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextResponse } from "next/server";
import { siteForKey } from "@/lib/agents/site";
import { createAgentServer } from "@/lib/agents/tools";
import { bearerToken, hasScope, resolveApiKey } from "@/lib/api-keys";

// The MCP endpoint for agents (docs/design/agents-mcp-and-cli.md, D-019):
// stateless, one JSON answer per request, a fresh server per call so no
// session is lost between instances. A key with the read scope names the
// site; a browser Origin is refused, as on every keyed endpoint (D-017).
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (req.headers.get("origin"))
    return NextResponse.json({ error: "browser origin" }, { status: 403 });
  const key = await resolveApiKey(bearerToken(req.headers));
  if (!key) return NextResponse.json({ error: "unknown key" }, { status: 401 });
  if (!hasScope(key, "read"))
    return NextResponse.json(
      { error: "key lacks the read scope" },
      { status: 403 }
    );
  const site = await siteForKey(key);
  if (!site)
    return NextResponse.json({ error: "site is gone" }, { status: 404 });

  const server = createAgentServer(key, site);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    void transport.close().catch(() => {});
  }
}

const notAllowed = () =>
  NextResponse.json(
    { error: "POST JSON-RPC to this endpoint; it keeps no session" },
    { status: 405, headers: { Allow: "POST" } }
  );
export const GET = notAllowed;
export const DELETE = notAllowed;
