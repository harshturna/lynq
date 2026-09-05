/**
 * The v2 batch envelope as the tracker produces it. Mirrors the server's zod
 * schema in lib/ingest/schema.ts; tests/tracker/contract.test.ts parses a
 * tracker-built batch with that schema so the two cannot drift.
 */
export type PageviewEvent = { t: "pageview"; ts: number; seq: number };
export type EngagementEvent = {
  t: "engagement";
  ts: number;
  seq: number;
  ms: number;
  scroll?: number;
};
export type CustomEvent = {
  t: "custom";
  ts: number;
  seq: number;
  name: string;
  props?: Record<string, unknown>;
};
export type VitalsEvent = {
  t: "vitals";
  ts: number;
  seq: number;
  m: Record<string, number>;
  targets?: Record<string, string>;
};
export type IdentifyEvent = { t: "identify"; ts: number; seq: number };
export type BatchEvent =
  | PageviewEvent
  | EngagementEvent
  | CustomEvent
  | VitalsEvent
  | IdentifyEvent;

export type Batch = {
  v: 2;
  site: string;
  sid: string;
  pid: string;
  uid?: string;
  page: { url: string; title?: string };
  session: { ref?: string; url?: string };
  ctx: { sw?: number; sh?: number; lang?: string };
  events: BatchEvent[];
};

/** The per-tab session record kept in sessionStorage (design §6.1). */
export type SessionRecord = {
  sid: string;
  started: number;
  last: number;
  seq: number;
  ref: string;
  url: string;
  uid?: string;
};

export const SESSION_IDLE_MS = 30 * 60 * 1000;
export const SESSION_MAX_MS = 6 * 60 * 60 * 1000;
export const BATCH_DELAY_MS = 1000;
export const BATCH_MAX_EVENTS = 20;
export const BATCH_MAX_BYTES = 8 * 1024;
export const SAFETY_FLUSH_MS = 5 * 60 * 1000;
