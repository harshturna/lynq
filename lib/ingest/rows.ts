import type { GeoCodes } from "@/lib/geo/request-geo";
import type { UaInfo } from "./enrich";
import { matchesAnyGlob } from "./glob";
import { classify } from "./referrers";
import type { Batch, BatchEvent } from "./schema";
import type { ResolvedSite } from "./site-resolution";
import { boundTimestamp } from "./time-bounds";
import { cleanText, parsePageUrl, parseReferrer, parseUtm } from "./url";

/** One analytics.events row, column names as in the table. */
export type EventRow = {
  site_id: number;
  ts: Date;
  received_at: Date;
  seq: number;
  event: BatchEvent["t"];
  name: string;
  visitor_id: bigint;
  session_id: bigint;
  user_hash: bigint;
  pageview_id: bigint;
  hostname: string;
  path: string;
  title: string;
  query: string;
  referrer: string;
  referrer_url: string;
  source: string;
  channel: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  country: string;
  region: string;
  city: string;
  device: string;
  browser: string;
  browser_major: number;
  browser_version: string;
  os: string;
  os_version: string;
  screen_width: number;
  screen_height: number;
  language: string;
  engaged_ms: number;
  scroll_depth: number;
  props: Record<string, string>;
  revenue: string | null;
  lcp: number | null;
  cls: number | null;
  inp: number | null;
  fcp: number | null;
  ttfb: number | null;
  dcl: number | null;
  load: number | null;
  tti: number | null;
  tbt: number | null;
  resources: number | null;
  lcp_target: string | null;
  inp_target: string | null;
  suspect: boolean;
  ingest_version: number;
};

export const EVENT_COLUMNS = [
  "site_id",
  "ts",
  "received_at",
  "seq",
  "event",
  "name",
  "visitor_id",
  "session_id",
  "user_hash",
  "pageview_id",
  "hostname",
  "path",
  "title",
  "query",
  "referrer",
  "referrer_url",
  "source",
  "channel",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "country",
  "region",
  "city",
  "device",
  "browser",
  "browser_major",
  "browser_version",
  "os",
  "os_version",
  "screen_width",
  "screen_height",
  "language",
  "engaged_ms",
  "scroll_depth",
  "props",
  "revenue",
  "lcp",
  "cls",
  "inp",
  "fcp",
  "ttfb",
  "dcl",
  "load",
  "tti",
  "tbt",
  "resources",
  "lcp_target",
  "inp_target",
  "suspect",
  "ingest_version",
] as const satisfies readonly (keyof EventRow)[];

export type Drop = { stage: "time_bound" | "excluded_path"; count: number };

export type BuildInput = {
  batch: Batch;
  site: ResolvedSite;
  hostnameFromOrigin: string;
  ua: UaInfo;
  geo: GeoCodes;
  visitorId: bigint;
  userHash: bigint;
  receivedAt: Date;
};

export type BuildOutput = {
  rows: EventRow[];
  dropped: Drop[];
  suspect: boolean;
  suspectReasons: string[];
};

const REVENUE = /^-?[0-9]+(\.[0-9]+)?$/;
const VITAL_KEYS = [
  "lcp",
  "cls",
  "inp",
  "fcp",
  "ttfb",
  "dcl",
  "load",
  "tti",
  "tbt",
] as const;

export function hexToBigInt(hex: string): bigint {
  return BigInt.asIntN(64, BigInt(`0x${hex}`));
}

/** Custom event props: ≤ 20 keys, keys ≤ 32, values stringified ≤ 256 (§7.6). */
export function normaliseProps(props: Record<string, unknown> | undefined): {
  props: Record<string, string>;
  revenue: string | null;
} {
  const out: Record<string, string> = {};
  let revenue: string | null = null;
  if (!props) return { props: out, revenue };
  for (const [key, value] of Object.entries(props).slice(0, 20)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "object") continue;
    const k = cleanText(key, 32);
    const v = cleanText(String(value), 256);
    if (!k) continue;
    out[k] = v;
    if (k === "revenue" && REVENUE.test(v)) revenue = v;
  }
  return { props: out, revenue };
}

/** Everything after validation and enrichment: the rows for one batch (§7.2 steps 6 to 11). */
export function buildRows(input: BuildInput): BuildOutput {
  const { batch, site, ua, geo, receivedAt } = input;
  const suspectReasons: string[] = [];
  if (batch.site.toLowerCase() !== input.hostnameFromOrigin)
    suspectReasons.push("site_mismatch");
  for (let i = 1; i < batch.events.length; i++) {
    const prev = batch.events[i - 1];
    const cur = batch.events[i];
    if (prev && cur && cur.seq <= prev.seq) {
      suspectReasons.push("seq_not_increasing");
      break;
    }
  }
  const suspect = suspectReasons.length > 0;

  const page = parsePageUrl(batch.page.url);
  if (!page) return { rows: [], dropped: [], suspect, suspectReasons };
  const title = site.settings.store_titles
    ? cleanText(batch.page.title, 512)
    : "";
  const utm = parseUtm(batch.session?.url);
  const ref = parseReferrer(batch.session?.ref, site.hostnames);
  const { source, channel } = classify(ref.referrer, utm);

  const shared = {
    site_id: site.siteId,
    received_at: receivedAt,
    visitor_id: input.visitorId,
    session_id: hexToBigInt(batch.sid),
    user_hash: input.userHash,
    pageview_id: hexToBigInt(batch.pid),
    hostname: page.hostname,
    path: page.path,
    title,
    query: page.query,
    referrer: ref.referrer,
    referrer_url: ref.referrer_url,
    source,
    channel,
    ...utm,
    country: geo.country,
    region: cleanText(geo.region, 64),
    city: cleanText(geo.city, 128),
    device: ua.device,
    browser: cleanText(ua.browser, 64),
    browser_major: ua.browser_major,
    browser_version: cleanText(ua.browser_version, 32),
    os: cleanText(ua.os, 64),
    os_version: cleanText(ua.os_version, 32),
    screen_width: batch.ctx?.sw ?? 0,
    screen_height: batch.ctx?.sh ?? 0,
    language: cleanText(batch.ctx?.lang, 35),
    suspect,
    ingest_version: 2,
  };

  const empty = {
    name: "",
    engaged_ms: 0,
    scroll_depth: 0,
    props: {} as Record<string, string>,
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
  };

  const excluded = matchesAnyGlob(page.path, site.settings.excluded_paths);
  let timeDropped = 0;
  let pathDropped = 0;
  const rows: EventRow[] = [];

  for (const ev of batch.events) {
    const ts = boundTimestamp(ev.ts, receivedAt);
    if (!ts) {
      timeDropped += 1;
      continue;
    }
    if (excluded) {
      pathDropped += 1;
      continue;
    }
    const base = { ...shared, ...empty, ts, seq: ev.seq, event: ev.t };
    switch (ev.t) {
      case "pageview":
      case "identify":
        rows.push(base);
        break;
      case "engagement":
        rows.push({ ...base, engaged_ms: ev.ms, scroll_depth: ev.scroll ?? 0 });
        break;
      case "custom": {
        const { props, revenue } = normaliseProps(ev.props);
        rows.push({ ...base, name: cleanText(ev.name, 64), props, revenue });
        break;
      }
      case "vitals": {
        const v: Partial<EventRow> = {};
        for (const key of VITAL_KEYS) {
          const n = ev.m[key];
          if (typeof n === "number") v[key] = n;
        }
        const resources = ev.m.resources;
        rows.push({
          ...base,
          ...v,
          resources:
            typeof resources === "number"
              ? Math.min(Math.round(resources), 32767)
              : null,
          lcp_target: ev.targets?.lcp ? cleanText(ev.targets.lcp, 256) : null,
          inp_target: ev.targets?.inp ? cleanText(ev.targets.inp, 256) : null,
        });
        break;
      }
    }
  }

  const dropped: Drop[] = [];
  if (timeDropped) dropped.push({ stage: "time_bound", count: timeDropped });
  if (pathDropped) dropped.push({ stage: "excluded_path", count: pathDropped });
  return { rows, dropped, suspect, suspectReasons };
}
