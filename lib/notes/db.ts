import "server-only";
import { sql } from "@/lib/db";

/** The database side of the notes API; the route and the integration test share it. */
export async function insertNote(note: {
  siteId: number;
  at: Date;
  text: string;
  author: string;
}): Promise<{ id: number }> {
  const [row] = await sql<{ id: number }[]>`
    insert into public.notes (site_id, at, text, author)
    values (${note.siteId}, ${note.at}, ${note.text}, ${note.author})
    returning id`;
  return { id: Number(row.id) };
}

/** Scoped to the site, so one site's key cannot delete another's note. */
export async function removeNote(siteId: number, id: number): Promise<boolean> {
  const rows = await sql`
    delete from public.notes where id = ${id} and site_id = ${siteId} returning id`;
  return rows.length > 0;
}
