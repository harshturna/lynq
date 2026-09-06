import { NextResponse } from "next/server";
import { allowKey, resolveApiKey } from "@/lib/api-keys";
import { handleBots, MAX_BODY_BYTES } from "@/lib/ingest/bots";
import { upsertCrawlerDays } from "@/lib/ingest/db-deps";

// Crawler hits reported by a middleware snippet on the customer's server
// (docs/design/bot-traffic.md §7, D-018). Not a browser endpoint: no CORS,
// and a request carrying an Origin is refused (D-017).
export const dynamic = "force-dynamic";
export const maxDuration = 5;

export async function POST(req: Request) {
  const declared = Number.parseInt(req.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "body too large" }, { status: 400 });
  }
  const body = await req.text();
  const result = await handleBots(
    { headers: req.headers, body, receivedAt: new Date() },
    { resolveKey: resolveApiKey, upsert: upsertCrawlerDays, allow: allowKey }
  );
  if (result.status !== 202) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
  }
  return NextResponse.json(
    { accepted: result.accepted, dropped: result.dropped },
    { status: 202 }
  );
}
