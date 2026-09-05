import { describe, expect, it } from "vitest";
import { batchSchema } from "@/lib/ingest/schema";
import {
  envelope,
  hexId,
  pageKey,
  split,
} from "../../packages/tracker/src/envelope";
import type {
  BatchEvent,
  SessionRecord,
} from "../../packages/tracker/src/types";

// The tracker's envelope must always parse with the server's zod schema.
const random = (n: number) =>
  Uint8Array.from({ length: n }, (_, i) => (i * 37 + 11) & 0xff);
const session: SessionRecord = {
  sid: hexId(random),
  started: 1,
  last: 1,
  seq: 3,
  ref: "https://news.ycombinator.com/",
  url: "https://aivia.byharsh.com/?utm_source=hn",
  uid: "user_1",
};
const page = {
  pid: hexId(random),
  url: "https://aivia.byharsh.com/pricing",
  title: "Pricing",
};
const ctx = { sw: 1440, sh: 900, lang: "en-GB" };
const events: BatchEvent[] = [
  { t: "pageview", ts: 1000, seq: 1 },
  { t: "custom", ts: 1001, seq: 2, name: "signup", props: { plan: "pro" } },
  { t: "engagement", ts: 1002, seq: 3, ms: 1234, scroll: 40 },
  {
    t: "vitals",
    ts: 1003,
    seq: 4,
    m: { lcp: 1834 },
    targets: { lcp: "img.hero" },
  },
  { t: "identify", ts: 1004, seq: 5 },
];

describe("tracker envelope contract", () => {
  it("parses with the server schema, with and without a user id", () => {
    const withUid = envelope(
      "aivia.byharsh.com",
      session,
      page,
      ctx,
      events,
      false
    );
    const parsed = batchSchema.safeParse(withUid);
    expect(
      parsed.success,
      JSON.stringify(parsed.success ? null : parsed.error.issues)
    ).toBe(true);
    expect(parsed.success && parsed.data.uid).toBe("user_1");
    const anonymous = envelope(
      "aivia.byharsh.com",
      session,
      page,
      ctx,
      events,
      true
    );
    expect(batchSchema.parse(anonymous).uid).toBeUndefined();
  });
  it("splits a long queue under both caps and never loses an event", () => {
    const many: BatchEvent[] = Array.from({ length: 45 }, (_, i) => ({
      t: "pageview",
      ts: i,
      seq: i,
    }));
    const batches = split(
      (evs) => envelope("aivia.byharsh.com", session, page, ctx, evs, true),
      many
    );
    expect(batches.map((b) => b.batch.events.length)).toEqual([20, 20, 5]);
    for (const b of batches)
      expect(batchSchema.safeParse(b.batch).success).toBe(true);
    const big: BatchEvent[] = Array.from({ length: 5 }, (_, i) => ({
      t: "custom",
      ts: i,
      seq: i,
      name: "x",
      props: { blob: "y".repeat(3000) },
    }));
    const byBytes = split(
      (evs) => envelope("aivia.byharsh.com", session, page, ctx, evs, true),
      big
    );
    expect(byBytes.length).toBeGreaterThan(1);
    expect(byBytes.reduce((n, b) => n + b.batch.events.length, 0)).toBe(5);
    for (const b of byBytes)
      expect(b.body.length).toBeLessThanOrEqual(8 * 1024 + 3100);
  });
  it("ids are sixteen hex characters", () => {
    expect(hexId(random)).toMatch(/^[0-9a-f]{16}$/);
  });
  it("the navigation key ignores hash and non-allow-listed params", () => {
    expect(pageKey("https://a.b/docs?session=1#top")).toBe("/docs");
    expect(pageKey("https://a.b/docs?utm_source=x&y=1")).toBe(
      "/docs?utm_source=x"
    );
    expect(pageKey("https://a.b/docs#a")).toBe(pageKey("https://a.b/docs#b"));
  });
});
