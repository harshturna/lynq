import { isbot } from "isbot";
import type { GeoCodes } from "@/lib/geo/request-geo";
import { getClientIp } from "./client-ip";
import { parseUserAgent } from "./enrich";
import { isExcludedIp } from "./excluded-ips";
import {
  userHash as computeUserHash,
  visitorId as computeVisitorId,
  utcDay,
} from "./hash";
import { normaliseHostname } from "./hostnames";
import { buildRows, type EventRow } from "./rows";
import { batchSchema } from "./schema";
import type { ResolvedSite } from "./site-resolution";

/**
 * The /api/collect pipeline (design §7.2), written as a function of its
 * inputs so it can be tested without a server or a database. The route
 * supplies the dependencies.
 */
export const MAX_BODY_BYTES = 32 * 1024;

export type LogEntry = {
  hostname: string;
  site_id: number | null;
  stage: string;
  detail: string;
};

export type CollectRequest = {
  headers: { get(name: string): string | null };
  /** The raw body; the route enforces Content-Length before reading it. */
  body: string;
  receivedAt: Date;
};

export type CollectDeps = {
  resolveSite: (hostname: string) => Promise<ResolvedSite | null>;
  saltFor: (day: string) => Promise<Buffer>;
  identitySecret: string;
  geo: (headers: CollectRequest["headers"]) => GeoCodes;
  insert: (rows: EventRow[]) => Promise<void>;
  log: (entries: LogEntry[]) => Promise<void>;
  rememberUser?: (
    siteId: number,
    userHash: bigint,
    uid: string
  ) => Promise<void>;
};

export type CollectResult = {
  status: 202 | 400;
  inserted: number;
  entries: LogEntry[];
};

export async function handleCollect(
  req: CollectRequest,
  deps: CollectDeps
): Promise<CollectResult> {
  const origin = req.headers.get("origin");
  const originHost = origin ? safeHost(origin) : null;
  const entries: LogEntry[] = [];
  const finish = async (
    status: 202 | 400,
    inserted = 0
  ): Promise<CollectResult> => {
    if (entries.length) await deps.log(entries).catch(() => {});
    return { status, inserted, entries };
  };

  // 1. gates
  if (!originHost) {
    entries.push({
      hostname: "",
      site_id: null,
      stage: "origin_missing",
      detail: "",
    });
    return finish(400);
  }
  if (Buffer.byteLength(req.body) > MAX_BODY_BYTES) {
    entries.push({
      hostname: originHost,
      site_id: null,
      stage: "size",
      detail: "",
    });
    return finish(400);
  }
  // 2. site
  const site = await deps.resolveSite(originHost);
  if (!site) {
    entries.push({
      hostname: originHost,
      site_id: null,
      stage: "unregistered",
      detail: "",
    });
    return finish(202);
  }
  // 3. excluded ip
  const ip = getClientIp(req.headers) ?? "";
  if (ip && isExcludedIp(ip, site.settings.excluded_ips)) {
    entries.push({
      hostname: originHost,
      site_id: site.siteId,
      stage: "excluded_ip",
      detail: "",
    });
    return finish(202);
  }
  // 4. bot
  const ua = req.headers.get("user-agent") ?? "";
  if (isbot(ua)) {
    entries.push({
      hostname: originHost,
      site_id: site.siteId,
      stage: "bot",
      detail: "",
    });
    return finish(202);
  }
  // 5. schema
  let json: unknown;
  try {
    json = JSON.parse(req.body);
  } catch {
    entries.push({
      hostname: originHost,
      site_id: site.siteId,
      stage: "schema",
      detail: "invalid json",
    });
    return finish(400);
  }
  const parsed = batchSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    entries.push({
      hostname: originHost,
      site_id: site.siteId,
      stage: "schema",
      detail: issue
        ? `${issue.path.join(".")}: ${issue.message}`.slice(0, 200)
        : "",
    });
    return finish(400);
  }
  const batch = parsed.data;
  const pageHost = safeHost(batch.page.url);
  if (!pageHost || !site.hostnames.includes(pageHost)) {
    entries.push({
      hostname: originHost,
      site_id: site.siteId,
      stage: "schema",
      detail: "page.url is not on this site",
    });
    return finish(400);
  }

  // 6 to 11. enrich, identity, rows
  const day = utcDay(req.receivedAt);
  const salt = await deps.saltFor(day);
  const anonymous = computeVisitorId(salt, site.siteId, ip, ua);
  const uHash = batch.uid
    ? computeUserHash(deps.identitySecret, site.siteId, batch.uid)
    : BigInt(0);
  const built = buildRows({
    batch,
    site,
    hostnameFromOrigin: originHost,
    ua: parseUserAgent(ua),
    geo: deps.geo(req.headers),
    visitorId: batch.uid ? uHash : anonymous,
    userHash: uHash,
    receivedAt: req.receivedAt,
  });
  for (const reason of built.suspectReasons) {
    entries.push({
      hostname: originHost,
      site_id: site.siteId,
      stage: reason === "site_mismatch" ? "site_mismatch" : "schema",
      detail: reason,
    });
  }
  for (const d of built.dropped) {
    entries.push({
      hostname: originHost,
      site_id: site.siteId,
      stage: d.stage,
      detail: String(d.count),
    });
  }
  if (batch.uid && site.settings.store_user_ids && deps.rememberUser) {
    await deps.rememberUser(site.siteId, uHash, batch.uid).catch(() => {});
  }

  // 12. insert
  if (built.rows.length) {
    try {
      await deps.insert(built.rows);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          lynq: "insert_failed",
          site: site.siteId,
          error: message.slice(0, 500),
        })
      );
      entries.push({
        hostname: originHost,
        site_id: site.siteId,
        stage: "insert_failed",
        detail: message.slice(0, 200),
      });
      return finish(202);
    }
  }
  return finish(202, built.rows.length);
}

function safeHost(value: string): string | null {
  try {
    return normaliseHostname(new URL(value).hostname);
  } catch {
    return null;
  }
}
