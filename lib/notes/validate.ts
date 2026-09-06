/**
 * What a note may be (docs/design/notes-on-charts.md §3), shared by the
 * server actions and the API so both refuse the same things the same way.
 */
export const NOTE_TEXT_MAX = 140;
const YEARS = 10;

export type NoteInput = { text: string; at?: string | number | null };
export type ValidNote = { text: string; at: Date };

export function validateNote(
  input: NoteInput,
  now = new Date()
): { ok: true; note: ValidNote } | { ok: false; error: string } {
  const text = (input.text ?? "").trim().replace(/\s+/g, " ");
  if (!text) return { ok: false, error: "Write the note first." };
  if (text.length > NOTE_TEXT_MAX)
    return {
      ok: false,
      error: `A note is at most ${NOTE_TEXT_MAX} characters; this one is ${text.length}.`,
    };
  let at: Date;
  if (input.at === undefined || input.at === null || input.at === "") at = now;
  else {
    const ms = typeof input.at === "number" ? input.at : Date.parse(input.at);
    if (!Number.isFinite(ms))
      return { ok: false, error: "The date is not one Lynq can read." };
    at = new Date(ms);
    const span = YEARS * 365.25 * 86_400_000;
    if (Math.abs(ms - now.getTime()) > span)
      return {
        ok: false,
        error: `The date must be within ${YEARS} years of today.`,
      };
  }
  return { ok: true, note: { text, at } };
}
