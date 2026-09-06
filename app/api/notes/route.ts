import { NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/api-keys";
import { makeLimiter } from "@/lib/ingest/bots";
import { handleCreateNote, MAX_BODY_BYTES } from "@/lib/notes/api";
import { insertNote, removeNote } from "@/lib/notes/db";

// A note pinned by a deploy pipeline or an agent (docs/design/notes-on-charts.md §6),
// with a key carrying the notes scope (D-017). Not a browser endpoint.
export const dynamic = "force-dynamic";
export const maxDuration = 5;

const allow = makeLimiter(60);

export async function POST(req: Request) {
  const declared = Number.parseInt(req.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "body too large" }, { status: 400 });
  }
  const body = await req.text();
  const result = await handleCreateNote(
    { headers: req.headers, body, receivedAt: new Date() },
    { resolveKey: resolveApiKey, insert: insertNote, remove: removeNote, allow }
  );
  if (result.status !== 201) {
    return NextResponse.json(
      { error: "error" in result ? result.error : "" },
      { status: result.status }
    );
  }
  return NextResponse.json({ id: result.id, at: result.at }, { status: 201 });
}
