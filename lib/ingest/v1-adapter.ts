import { createHmac } from "node:crypto";
import type { GeoCodes } from "@/lib/geo/request-geo";
import type { UaInfo } from "./enrich";
import { idFromText, legacyVisitorId, utcDay } from "./hash";
import { classify } from "./referrers";
import { type EventRow, normaliseProps } from "./rows";
import type { ResolvedSite } from "./site-resolution";
import { boundTimestamp } from "./time-bounds";
import { cleanText, parsePageUrl, parseReferrer, parseUtm } from "./url";

/**
 * Maps a v1 tracker event (design §7.9) onto analytics.events rows with
 * ingest_version = 1, so existing installs feed the new table while the v1
 * script is still deployed. Pure: the route supplies the site, enrichment
 * and clock, and inserts what comes back.
 *
 * v1 sends one event per request and no page id, so a small per-instance
 * memory keeps, per session: the entry referrer and UTM (a session property
 * in v2), the current pageview id (engagement, vitals and custom rows attach
 * to it) and a sequence counter. When memory has nothing (a cold start
 * mid-session) the ids are hashed from the session id, which keeps every row
 * attached to something stable.
 */

/** The legacy visitor salt is derived from the identity secret; the backfill derives the same. */
export function legacySalt(identitySecret: string): Buffer {
  return createHmac("sha256", identitySecret)
    .update("lynq-legacy-salt")
    .digest();
}

type SessionMemory = {
  referrer: string;
  referrer_url: string;
  source: string;
  channel: string;
  utm: ReturnType<typeof parseUtm>;
  pageviewId: bigint;
  seq: number;
  touched: number;
};

export function createV1Memory(ttlMs = 6 * 60 * 60 * 1000, max = 5000) {
  const sessions = new Map<string, SessionMemory>();
  function get(sessionId: string, now: number): SessionMemory | undefined {
    const m = sessions.get(sessionId);
    if (m && now - m.touched < ttlMs) return m;
    if (m) sessions.delete(sessionId);
    return undefined;
  }
  function set(sessionId: string, m: SessionMemory) {
    if (sessions.size >= max) {
      const oldest = sessions.keys().next().value;
      if (oldest !== undefined) sessions.delete(oldest);
    }
    sessions.set(sessionId, m);
  }
  return { get, set, size: () => sessions.size };
}

export type V1Memory = ReturnType<typeof createV1Memory>;

export type V1Context = {
  site: ResolvedSite;
  ua: UaInfo;
  geo: GeoCodes;
  receivedAt: Date;
  identitySecret: string;
  memory: V1Memory;
};

const VITAL_MAP: [keyof WebVitalsEventData, keyof EventRow][] = [
  ["lcp", "lcp"],
  ["cls", "cls"],
  ["inp", "inp"],
  ["fcp", "fcp"],
  ["ttfb", "ttfb"],
  ["tbt", "tbt"],
  ["dcl", "dcl"],
  ["load", "load"],
  ["tti", "tti"],
];

export function mapV1Event(body: TTrackedEvent, ctx: V1Context): EventRow[] {
  const { site, ua, geo, receivedAt, memory } = ctx;
  const now = receivedAt.getTime();
  const sessionKey = body.sessionId;
  const sessionId = idFromText("session", sessionKey);
  const visitorId = legacyVisitorId(
    legacySalt(ctx.identitySecret),
    utcDay(receivedAt),
    site.siteId,
    body.clientId
  );

  const bounded = boundTimestamp(body.timestamp, receivedAt);
  const ts = bounded ?? receivedAt;
  const suspect = bounded === null;

  const page = parsePageUrl(body.url) ?? {
    hostname: site.hostnames[0] ?? "",
    path: cleanText(body.pathname || "/", 2048),
    query: "",
  };

  let mem = memory.get(sessionKey, now);
  const isPageview =
    body.event === "session-start" || body.event === "page-view";

  if (!mem || isPageview) {
    // First sight of the session, or a new page: (re)establish page context.
    // The session's referrer is fixed at first sight; v1 sends "Direct" for
    // same-site navigation, which parseReferrer treats as no referrer.
    const first = !mem;
    const ref = first
      ? parseReferrer(
          body.referrer && body.referrer !== "Direct"
            ? body.referrer
            : undefined,
          site.hostnames
        )
      : {
          referrer: mem?.referrer ?? "",
          referrer_url: mem?.referrer_url ?? "",
        };
    const utm = first ? parseUtm(body.url) : (mem?.utm ?? parseUtm(undefined));
    const { source, channel } = first
      ? classify(ref.referrer, utm)
      : { source: mem?.source ?? "", channel: mem?.channel ?? "Direct" };
    const seq = (mem?.seq ?? 0) + 1;
    mem = {
      ...ref,
      source,
      channel,
      utm,
      pageviewId: isPageview
        ? idFromText("pageview", `${sessionKey}:${seq}:${ts.getTime()}`)
        : (mem?.pageviewId ?? idFromText("pageview", sessionKey)),
      seq,
      touched: now,
    };
    memory.set(sessionKey, mem);
  } else {
    mem.seq += 1;
    mem.touched = now;
  }

  const base: EventRow = {
    site_id: site.siteId,
    ts,
    received_at: receivedAt,
    seq: mem.seq,
    event: "pageview",
    name: "",
    visitor_id: visitorId,
    session_id: sessionId,
    user_hash: BigInt(0),
    pageview_id: mem.pageviewId,
    hostname: page.hostname,
    path: page.path,
    title: "",
    query: page.query,
    referrer: mem.referrer,
    referrer_url: mem.referrer_url,
    source: mem.source,
    channel: mem.channel,
    ...mem.utm,
    country: geo.country,
    region: cleanText(geo.region, 64),
    city: cleanText(geo.city, 128),
    device: ua.device,
    browser: cleanText(ua.browser, 64),
    browser_major: ua.browser_major,
    browser_version: cleanText(ua.browser_version, 32),
    os: cleanText(ua.os, 64),
    os_version: cleanText(ua.os_version, 32),
    screen_width: 0,
    screen_height: 0,
    language: "",
    engaged_ms: 0,
    scroll_depth: 0,
    props: {},
    revenue: null,
    lcp: null,
    cls: null,
    inp: null,
    fcp: null,
    ttfb: null,
    dcl: null,
    load: null,
    tti: null,
    tbt: null,
    resources: null,
    lcp_target: null,
    inp_target: null,
    suspect,
    ingest_version: 1,
  };

  switch (body.event) {
    case "session-start":
    case "page-view":
      return [base];
    case "custom-event":
    case "initial-custom-event": {
      const { props, revenue } = normaliseProps(
        (body.eventData.properties ?? undefined) as
          | Record<string, unknown>
          | undefined
      );
      return [
        {
          ...base,
          event: "custom",
          name: cleanText(body.eventData.name, 64),
          props,
          revenue,
        },
      ];
    }
    case "session-end": {
      const engagement: EventRow = {
        ...base,
        event: "engagement",
        engaged_ms: Math.max(
          0,
          Math.min(
            Math.round(body.eventData.sessionDuration || 0),
            6 * 3_600_000
          )
        ),
      };
      const metrics = body.eventData.metrics;
      const vitals: EventRow = { ...base, event: "vitals", seq: mem.seq + 1 };
      mem.seq += 1;
      let any = false;
      if (metrics) {
        for (const [from, to] of VITAL_MAP) {
          const v = metrics[from];
          if (typeof v === "number" && Number.isFinite(v) && v > 0) {
            (vitals as unknown as Record<string, unknown>)[to] = v;
            any = true;
          }
        }
        if (
          typeof metrics.resourceCount === "number" &&
          metrics.resourceCount > 0
        ) {
          vitals.resources = Math.min(Math.round(metrics.resourceCount), 32767);
          any = true;
        }
      }
      return any ? [engagement, vitals] : [engagement];
    }
    default:
      return [];
  }
}
