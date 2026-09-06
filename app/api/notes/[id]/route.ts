import { NextResponse } from "next/server";
import { allowKey, resolveApiKey } from "@/lib/api-keys";
import { handleDeleteNote } from "@/lib/notes/api";
import { insertNote, removeNote } from "@/lib/notes/db";

// Retract a note a pipeline pinned (docs/design/notes-on-charts.md §6).
export const dynamic = "force-dynamic";
export const maxDuration = 5;

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const result = await handleDeleteNote(
    { headers: req.headers, body: "", receivedAt: new Date() },
    Number.parseInt(id, 10),
    {
      resolveKey: resolveApiKey,
      insert: insertNote,
      remove: removeNote,
      allow: allowKey,
    }
  );
  if (result.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(
    { error: "error" in result ? result.error : "" },
    { status: result.status }
  );
}
