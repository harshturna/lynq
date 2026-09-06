import { z } from "zod";
import { bearerToken, hasScope, type ResolvedKey } from "@/lib/api-keys";
import { classifyCrawler, crawlerPath, type Family } from "./crawlers";
import { utcDay } from "./hash";

/**
 * The /api/bots pipeline (docs/design/bot-traffic.md §7, D-018), a function
 * of its inputs like handleCollect so it can be tested without a server. A
 * middleware snippet on the customer's server posts the user agent and path
 * of each request; Lynq decides which are crawlers and counts those, by day.
 */
export const MAX_BATCH = 50;
export const MAX_BODY_BYTES = 32 * 1024;
/** How far back a reported request may be dated before it is counted as now. */
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;
const MAX_AHEAD_MS = 5 * 60 * 1000;

const hitSchema = z.object({
  ua: z.string().max(1024).default(""),
  path: z.string().max(2048).default("/"),
  status: z.number().int().min(0).max(999).optional(),
  /** ISO string or epoch milliseconds; missing means when it arrived. */
  at: z.union([z.string().max(40), z.number()]).optional(),
});
export const batchSchema = z.array(hitSchema).max(MAX_BATCH);

export type CrawlerDayRow = {
  site_id: number;
  day: string;
  crawler: string;
  family: Family;
  path: string;
  hits: number;
  last_status: number;
  last_seen: Date;
};

export type BotsRequest = {
  headers: { get(name: string): string | null };
  body: string;
  receivedAt: Date;
};

export type BotsDeps = {
  resolveKey: (token: string | null) => Promise<ResolvedKey | null>;
  upsert: (rows: CrawlerDayRow[]) => Promise<void>;
  /** Per-key rate limit (allowKey in lib/api-keys.ts); true when the batch may proceed. */
  allow?: (keyId: number) => boolean | Promise<boolean>;
};

export type BotsResult = {
  status: 202 | 400 | 401 | 403 | 429;
  /** Requests counted as crawler hits. */
  accepted: number;
  /** Requests that were not a bot, or not parseable. */
  dropped: number;
  error?: string;
};

export async function handleBots(
  req: BotsRequest,
  deps: BotsDeps
): Promise<BotsResult> {
  const fail = (status: BotsResult["status"], error: string): BotsResult => ({
    status,
    accepted: 0,
    dropped: 0,
    error,
  });
  // 1. never from a browser (D-017): a key that leaks into a page is worthless here
  if (req.headers.get("origin")) return fail(403, "browser origin");
  // 2. the key and its scope
  const key = await deps.resolveKey(bearerToken(req.headers));
  if (!key) return fail(401, "unknown key");
  if (!hasScope(key, "ingest")) return fail(403, "key lacks the ingest scope");
  if (deps.allow && !(await deps.allow(key.keyId)))
    return fail(429, "too many batches");
  // 3. shape
  if (Buffer.byteLength(req.body) > MAX_BODY_BYTES)
    return fail(400, "body too large");
  let json: unknown;
  try {
    json = JSON.parse(req.body);
  } catch {
    return fail(400, "invalid json");
  }
  const parsed = batchSchema.safeParse(json);
  if (!parsed.success) return fail(400, "invalid batch");
  // 4. classify and fold to (day, crawler, path)
  const rows = new Map<string, CrawlerDayRow>();
  let dropped = 0;
  let accepted = 0;
  for (const hit of parsed.data) {
    const c = classifyCrawler(hit.ua);
    if (!c) {
      dropped++;
      continue;
    }
    accepted++;
    const at = when(hit.at, req.receivedAt);
    const day = utcDay(at);
    const path = crawlerPath(hit.path);
    const id = `${day}\n${c.crawler}\n${path}`;
    const row = rows.get(id);
    if (row) {
      row.hits++;
      if (at >= row.last_seen) {
        row.last_seen = at;
        row.last_status = hit.status ?? row.last_status;
      }
    } else {
      rows.set(id, {
        site_id: key.siteId,
        day,
        crawler: c.crawler,
        family: c.family,
        path,
        hits: 1,
        last_status: hit.status ?? 0,
        last_seen: at,
      });
    }
  }
  if (rows.size) await deps.upsert([...rows.values()]);
  return { status: 202, accepted, dropped };
}

function when(at: string | number | undefined, receivedAt: Date): Date {
  if (at === undefined) return receivedAt;
  const ms = typeof at === "number" ? at : Date.parse(at);
  if (!Number.isFinite(ms)) return receivedAt;
  const now = receivedAt.getTime();
  if (ms < now - MAX_AGE_MS || ms > now + MAX_AHEAD_MS) return receivedAt;
  return new Date(ms);
}
