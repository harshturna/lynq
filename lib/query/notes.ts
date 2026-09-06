import { type Compiled, Query } from "./builder";
import type { QueryContext } from "./primitives";

/**
 * Notes (TICKET-076, docs/design/notes-on-charts.md): the sentences pinned
 * to a site inside the range, oldest first, for the markers on its time
 * charts. Filters do not apply; a note is about the site, not a segment.
 */
export type NoteRow = {
  id: number;
  at: Date;
  text: string;
  author: string;
};

export const NOTES_LIMIT = 200;

export function notesQuery(ctx: QueryContext): Compiled {
  const q = new Query();
  return {
    text: `select id, at, text, author
from public.notes
where site_id = ${q.p(ctx.siteId)}
  and at >= ${q.p(ctx.range.from)} and at < ${q.p(ctx.range.toExclusive)}
order by at, id
limit ${q.p(NOTES_LIMIT)}`,
    params: q.params,
  };
}
