import { bearerToken, hasScope, type ResolvedKey } from "@/lib/api-keys";
import { validateNote } from "./validate";

/**
 * The notes API (docs/design/notes-on-charts.md §6): a deploy pipeline or an
 * agent pins a note with a key carrying the `notes` scope. Written as a
 * function of its inputs, like the collector and /api/bots, so it is tested
 * without a server.
 */
export const MAX_BODY_BYTES = 4 * 1024;

export type NotesRequest = {
  headers: { get(name: string): string | null };
  body: string;
  receivedAt: Date;
};

export type NotesDeps = {
  resolveKey: (token: string | null) => Promise<ResolvedKey | null>;
  insert: (note: {
    siteId: number;
    at: Date;
    text: string;
    author: string;
  }) => Promise<{ id: number }>;
  remove: (siteId: number, id: number) => Promise<boolean>;
  allow?: (keyId: number) => boolean;
};

export type NotesResult =
  | { status: 201; id: number; at: string }
  | { status: 204 }
  | { status: 400 | 401 | 403 | 404 | 429; error: string };

/** The key, or the refusal, shared by both verbs. */
async function gate(
  req: NotesRequest,
  deps: NotesDeps
): Promise<{ key: ResolvedKey } | { status: 401 | 403 | 429; error: string }> {
  if (req.headers.get("origin"))
    return { status: 403, error: "browser origin" };
  const key = await deps.resolveKey(bearerToken(req.headers));
  if (!key) return { status: 401, error: "unknown key" };
  if (!hasScope(key, "notes"))
    return { status: 403, error: "key lacks the notes scope" };
  if (deps.allow && !deps.allow(key.keyId))
    return { status: 429, error: "too many requests" };
  return { key };
}

export async function handleCreateNote(
  req: NotesRequest,
  deps: NotesDeps
): Promise<NotesResult> {
  const g = await gate(req, deps);
  if (!("key" in g)) return g;
  if (Buffer.byteLength(req.body) > MAX_BODY_BYTES)
    return { status: 400, error: "body too large" };
  let json: unknown;
  try {
    json = JSON.parse(req.body);
  } catch {
    return { status: 400, error: "invalid json" };
  }
  if (!json || typeof json !== "object" || Array.isArray(json))
    return { status: 400, error: "expected an object with text and at" };
  const { text, at } = json as { text?: unknown; at?: unknown };
  const v = validateNote(
    {
      text: typeof text === "string" ? text : "",
      at: typeof at === "string" || typeof at === "number" ? at : undefined,
    },
    req.receivedAt
  );
  if (!v.ok) return { status: 400, error: v.error };
  const { id } = await deps.insert({
    siteId: g.key.siteId,
    at: v.note.at,
    text: v.note.text,
    author: `key:${g.key.name}`,
  });
  return { status: 201, id, at: v.note.at.toISOString() };
}

export async function handleDeleteNote(
  req: NotesRequest,
  id: number,
  deps: NotesDeps
): Promise<NotesResult> {
  const g = await gate(req, deps);
  if (!("key" in g)) return g;
  if (!Number.isInteger(id) || id <= 0)
    return { status: 404, error: "no such note" };
  const gone = await deps.remove(g.key.siteId, id);
  return gone ? { status: 204 } : { status: 404, error: "no such note" };
}
