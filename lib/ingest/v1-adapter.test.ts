import { describe, expect, it } from "vitest";
import { parseUserAgent } from "./enrich";
import { CHROME, SITE } from "./fixtures";
import { idFromText } from "./hash";
import {
  createV1Memory,
  legacySalt,
  mapV1Event,
  type V1Context,
} from "./v1-adapter";

const receivedAt = new Date("2026-09-05T12:00:00Z");
const now = receivedAt.getTime();

function ctx(memory = createV1Memory()): V1Context {
  return {
    site: SITE,
    ua: parseUserAgent(CHROME),
    geo: { country: "CA", region: "MB", city: "Winnipeg" },
    receivedAt,
    identitySecret: "secret",
    memory,
  };
}

const base = {
  timestamp: now - 1000,
  url: "https://aivia.byharsh.com/pricing?utm_source=hn",
  pathname: "/pricing",
  referrer: "https://news.ycombinator.com/item?id=1",
  dataDomain: "aivia.byharsh.com",
  clientId: "client-abc",
  sessionId: "session-xyz",
  userAgentData: { browser: "Chrome" as const, os: "Mac" as const },
};

describe("v1 adapter", () => {
  it("maps session-start to a pageview with the session's referrer and utm", () => {
    const rows = mapV1Event(
      { ...base, event: "session-start", eventData: {} },
      ctx()
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      event: "pageview",
      ingest_version: 1,
      path: "/pricing",
      query: "utm_source=hn",
      referrer: "news.ycombinator.com",
      source: "hn",
      channel: "Referral",
      utm_source: "hn",
      country: "CA",
      browser: "Chrome",
      session_id: idFromText("session", "session-xyz"),
      seq: 1,
      suspect: false,
    });
    expect(rows[0]?.ts.getTime()).toBe(now - 1000);
  });

  it("keeps the session referrer on later pageviews and attaches events to the current page", () => {
    const memory = createV1Memory();
    const c = ctx(memory);
    const [start] = mapV1Event(
      { ...base, event: "session-start", eventData: {} },
      c
    );
    const [pv] = mapV1Event(
      {
        ...base,
        event: "page-view",
        url: "https://aivia.byharsh.com/docs",
        pathname: "/docs",
        referrer: "Direct",
        eventData: {},
      },
      c
    );
    const [custom] = mapV1Event(
      {
        ...base,
        event: "custom-event",
        pathname: "/docs",
        eventData: {
          name: "signup",
          eventId: "e1",
          properties: { plan: "pro" },
        },
      },
      c
    );
    expect(pv).toMatchObject({
      path: "/docs",
      referrer: "news.ycombinator.com",
      seq: 2,
    });
    expect(pv?.pageview_id).not.toBe(start?.pageview_id);
    expect(custom).toMatchObject({
      event: "custom",
      name: "signup",
      props: { plan: "pro" },
      seq: 3,
    });
    expect(custom?.pageview_id).toBe(pv?.pageview_id);
  });

  it("maps session-end to an engagement row and a vitals row on the current page", () => {
    const c = ctx();
    mapV1Event({ ...base, event: "session-start", eventData: {} }, c);
    const rows = mapV1Event(
      {
        ...base,
        event: "session-end",
        eventData: {
          sessionDuration: 45_000,
          metrics: {
            lcp: 1834,
            cls: 0.02,
            inp: 0,
            fcp: 900,
            ttfb: 120,
            tbt: 30,
            dcl: 800,
            load: 1500,
            tti: 700,
            interactionCount: 3,
            resourceCount: 42,
            totalJSHeapSize: 1,
            usedJSHeapSize: 1,
          },
        },
      },
      c
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ event: "engagement", engaged_ms: 45_000 });
    expect(rows[1]).toMatchObject({
      event: "vitals",
      lcp: 1834,
      cls: 0.02,
      inp: null,
      resources: 42,
      load: 1500,
    });
    expect(rows[1]?.seq).toBe(rows[0]!.seq + 1);
  });

  it("copes with a cold start mid-session and a bad clock", () => {
    const c = ctx();
    const [custom] = mapV1Event(
      {
        ...base,
        event: "custom-event",
        timestamp: now - 48 * 3_600_000,
        eventData: { name: "x", eventId: "e", properties: null },
      },
      c
    );
    expect(custom).toMatchObject({
      event: "custom",
      suspect: true,
      pageview_id: idFromText("pageview", "session-xyz"),
    });
    expect(custom?.ts.getTime()).toBe(now);
  });

  it("derives one legacy salt per secret and rotates visitor ids by day", () => {
    expect(legacySalt("a")).toEqual(legacySalt("a"));
    expect(legacySalt("a")).not.toEqual(legacySalt("b"));
    const c = ctx();
    const [today] = mapV1Event(
      { ...base, event: "session-start", eventData: {} },
      c
    );
    const [tomorrow] = mapV1Event(
      { ...base, event: "session-start", eventData: {} },
      { ...ctx(), receivedAt: new Date("2026-09-06T12:00:00Z") }
    );
    expect(today?.visitor_id).not.toBe(tomorrow?.visitor_id);
  });
});
