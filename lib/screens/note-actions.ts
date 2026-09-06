"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { validateNote } from "@/lib/notes/validate";
import { getUser } from "@/lib/user/server";
import { resolveSite } from "./site";

/**
 * Note writes from the app (docs/design/notes-on-charts.md §5): the owner's
 * session, the guest refused with one sentence, the same validation as the
 * API. The author is the owner's email.
 */
export type NoteResult =
  | { ok: true; id: number }
  | { ok: false; error: string };

const GUEST = "The guest account cannot change notes.";

async function owner(slug: string) {
  const user = await getUser();
  if (!user?.id)
    return { ok: false as const, error: "Your session has expired." };
  if (user.id === process.env.GUEST_USER_ID)
    return { ok: false as const, error: GUEST };
  const { site } = await resolveSite(slug);
  return { ok: true as const, siteId: site.siteId, email: user.email ?? "" };
}

export async function createNote(
  slug: string,
  input: { text: string; at?: string | null }
): Promise<NoteResult> {
  const o = await owner(slug);
  if (!o.ok) return o;
  const v = validateNote(input);
  if (!v.ok) return v;
  const [row] = await sql<{ id: number }[]>`
    insert into public.notes (site_id, at, text, author)
    values (${o.siteId}, ${v.note.at}, ${v.note.text}, ${o.email})
    returning id`;
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, id: Number(row.id) };
}

export async function updateNote(
  slug: string,
  id: number,
  input: { text: string; at?: string | null }
): Promise<NoteResult> {
  const o = await owner(slug);
  if (!o.ok) return o;
  const v = validateNote(input);
  if (!v.ok) return v;
  const rows = await sql`
    update public.notes set at = ${v.note.at}, text = ${v.note.text}, updated_at = now()
    where id = ${id} and site_id = ${o.siteId} returning id`;
  if (!rows.length) return { ok: false, error: "That note is already gone." };
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, id };
}

export async function deleteNote(
  slug: string,
  id: number
): Promise<NoteResult> {
  const o = await owner(slug);
  if (!o.ok) return o;
  const rows = await sql`
    delete from public.notes where id = ${id} and site_id = ${o.siteId} returning id`;
  if (!rows.length) return { ok: false, error: "That note is already gone." };
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, id };
}
