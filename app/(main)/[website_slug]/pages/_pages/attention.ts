import type { Segment } from "@/components/shell/views";

/**
 * The facts behind the Pages attention line (D-011): the split of pageviews
 * across the top pages, and what the table does not show at a glance, how
 * concentrated attention is and where it lingers longest and shortest.
 */
export type AttentionRow = {
  value: string;
  pageviews: number;
  engagedMs: number;
};

export type AttentionSummary = {
  segments: Segment[];
  /** Share of all pageviews taken by the top `topCount` pages, 0 to 100. */
  topShare: number;
  topCount: number;
  longest: { path: string; ms: number } | null;
  shortest: { path: string; ms: number } | null;
};

export const SHOWN_PAGES = 6;
const TOP_FOR_SHARE = 3;

export function attentionSummary(
  rows: AttentionRow[],
  totalPageviews: number,
  shown = SHOWN_PAGES
): AttentionSummary | null {
  const ranked = [...rows]
    .filter((r) => r.pageviews > 0)
    .sort((a, b) => b.pageviews - a.pageviews);
  if (ranked.length < 2) return null;
  const top = ranked.slice(0, shown);
  const segments: Segment[] = top.map((r) => ({
    key: r.value,
    label: r.value,
    value: r.pageviews,
  }));
  const rest = totalPageviews - top.reduce((a, r) => a + r.pageviews, 0);
  const others = ranked.length - top.length;
  if (rest > 0)
    segments.push({
      key: "__rest",
      label:
        others > 0
          ? `${others} other ${others === 1 ? "page" : "pages"}`
          : "other pageviews",
      value: rest,
    });
  const total = Math.max(
    totalPageviews,
    top.reduce((a, r) => a + r.pageviews, 0)
  );
  const topCount = Math.min(TOP_FOR_SHARE, ranked.length);
  const topShare =
    (ranked.slice(0, topCount).reduce((a, r) => a + r.pageviews, 0) / total) *
    100;
  const timed = top.filter((r) => r.engagedMs > 0);
  const longest = timed.reduce<AttentionRow | null>(
    (best, r) => (best === null || r.engagedMs > best.engagedMs ? r : best),
    null
  );
  const shortest = timed.reduce<AttentionRow | null>(
    (best, r) => (best === null || r.engagedMs < best.engagedMs ? r : best),
    null
  );
  return {
    segments,
    topShare,
    topCount,
    longest: longest ? { path: longest.value, ms: longest.engagedMs } : null,
    shortest:
      shortest && shortest !== longest
        ? { path: shortest.value, ms: shortest.engagedMs }
        : null,
  };
}

/**
 * The Attention view's lead (TICKET-080, D-016): attention is a finite pool
 * the site spent, so the view names it before ranking it. Shares are of
 * total attention, not of pageviews, which is what the D-011 line above
 * splits.
 */
export type AttentionLead = {
  segments: Segment[];
  /** Attention of the whole site in the range, in milliseconds. */
  totalMs: number;
  /** Share the segments above the rest hold, 0 to 100. */
  topShare: number;
  topCount: number;
  leader: { path: string; ms: number; share: number; read: number | null };
};

export const LEAD_PAGES = 5;

export function attentionLead(
  rows: {
    value: string;
    attention_ms: number;
    read_through: number | null;
  }[],
  totalMs: number,
  shown = LEAD_PAGES
): AttentionLead | null {
  const ranked = rows.filter((r) => r.attention_ms > 0);
  if (ranked.length < 2 || totalMs <= 0) return null;
  const top = ranked.slice(0, shown);
  const segments: Segment[] = top.map((r) => ({
    key: r.value,
    label: r.value,
    value: r.attention_ms,
  }));
  const rest = totalMs - top.reduce((a, r) => a + r.attention_ms, 0);
  const others = ranked.length - top.length;
  if (rest > 0)
    segments.push({
      key: "__rest",
      label:
        others > 0
          ? `${others} other ${others === 1 ? "page" : "pages"}`
          : "other pages",
      value: rest,
    });
  const first = top[0];
  return {
    segments,
    totalMs,
    topShare: (top.reduce((a, r) => a + r.attention_ms, 0) / totalMs) * 100,
    topCount: top.length,
    leader: {
      path: first.value,
      ms: first.attention_ms,
      share: (first.attention_ms / totalMs) * 100,
      read: first.read_through,
    },
  };
}
