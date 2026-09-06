import type { Point } from "./format";

/**
 * Notes on a time chart (docs/design/notes-on-charts.md §4): a note is an
 * instant and a sentence; a chart is a row of buckets. Each note lands in
 * the last bucket that starts at or before it, and a bucket with several
 * notes shows one marker for all of them. Pure, so the folding is tested.
 */
export type ChartNote = {
  id: number;
  /** ISO instant. */
  at: string;
  text: string;
};

export type NoteMarker = {
  /** Index into the series' points. */
  index: number;
  /** The marker's label: the note's text, or "2 notes". */
  label: string;
  texts: string[];
};

const LABEL_MAX = 28;

export function noteMarkers(notes: ChartNote[], points: Point[]): NoteMarker[] {
  if (!notes.length || !points.length) return [];
  const starts = points.map((p) => Date.parse(p.t));
  const byIndex = new Map<number, string[]>();
  for (const n of notes) {
    const at = Date.parse(n.at);
    if (!Number.isFinite(at) || at < starts[0]) continue;
    let idx = 0;
    for (let i = 0; i < starts.length; i++) {
      if (starts[i] <= at) idx = i;
      else break;
    }
    const list = byIndex.get(idx) ?? [];
    list.push(n.text);
    byIndex.set(idx, list);
  }
  return [...byIndex.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, texts]) => ({
      index,
      label: texts.length === 1 ? shorten(texts[0]) : `${texts.length} notes`,
      texts,
    }));
}

function shorten(text: string): string {
  const t = text.trim();
  return t.length > LABEL_MAX ? `${t.slice(0, LABEL_MAX - 1).trimEnd()}…` : t;
}
