import {
  BATCH_MAX_BYTES,
  BATCH_MAX_EVENTS,
  type Batch,
  type BatchEvent,
  type SessionRecord,
} from "./types";

/**
 * Pure batch construction, kept free of DOM access so it can be unit-tested
 * against the server schema. Splits a queue into batches that respect the
 * event and byte caps (design §7.1).
 */
export type PageContext = { pid: string; url: string; title?: string };
export type Ctx = {
  sw?: number;
  sh?: number;
  vw?: number;
  vh?: number;
  lang?: string;
};

export function envelope(
  site: string,
  session: SessionRecord,
  page: PageContext,
  ctx: Ctx,
  events: BatchEvent[],
  anonymous: boolean
): Batch {
  const b: Batch = {
    v: 2,
    site,
    sid: session.sid,
    pid: page.pid,
    page: { url: page.url, title: page.title },
    session: { ref: session.ref, url: session.url },
    ctx,
    events,
  };
  if (session.uid && !anonymous) b.uid = session.uid;
  return b;
}

/** Split events into batches under both caps; a single oversized event goes alone. */
export function split(
  build: (events: BatchEvent[]) => Batch,
  events: BatchEvent[]
): { batch: Batch; body: string }[] {
  const out: { batch: Batch; body: string }[] = [];
  let current: BatchEvent[] = [];
  const flush = () => {
    if (!current.length) return;
    const batch = build(current);
    out.push({ batch, body: JSON.stringify(batch) });
    current = [];
  };
  for (const ev of events) {
    current.push(ev);
    const size = JSON.stringify(build(current)).length;
    if (current.length > BATCH_MAX_EVENTS || size > BATCH_MAX_BYTES) {
      if (current.length === 1) {
        flush();
      } else {
        current.pop();
        flush();
        current = [ev];
      }
    }
  }
  flush();
  return out;
}

/** 16 lowercase hex characters from 8 random bytes. */
export function hexId(random: (n: number) => Uint8Array): string {
  const bytes = random(8);
  let s = "";
  for (const b of bytes) s += (b < 16 ? "0" : "") + b.toString(16);
  return s;
}

/** The navigation key: a pageview is emitted only when this changes (design §8.2). */
export function pageKey(href: string): string {
  try {
    const u = new URL(href);
    const kept = new URLSearchParams();
    for (const k of [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
    ]) {
      const v = u.searchParams.get(k);
      if (v) kept.set(k, v);
    }
    const q = kept.toString();
    return u.pathname + (q ? `?${q}` : "");
  } catch {
    return href;
  }
}
