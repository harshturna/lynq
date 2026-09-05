import { createHash, createHmac } from "node:crypto";

/**
 * Identity hashes (design §5). One implementation for ingest and the
 * backfill so they cannot disagree on byte order or signedness.
 *
 * All three return the first 8 bytes of a SHA-256 digest read little-endian
 * and reinterpreted as a signed 64-bit integer, which is what a Postgres
 * bigint holds. The reinterpretation is a bijection, so grouping and counting
 * stay exact.
 */

const SEP = Buffer.from([0]);

function siteIdBytes(siteId: number | bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(BigInt(siteId));
  return b;
}

export function digestToInt64(digest: Buffer): bigint {
  return BigInt.asIntN(64, digest.subarray(0, 8).readBigUInt64LE());
}

/** Anonymous visitor: rotates with the daily salt (D-003). */
export function visitorId(
  salt: Buffer,
  siteId: number | bigint,
  clientIp: string,
  userAgent: string
): bigint {
  const h = createHash("sha256");
  h.update(salt);
  h.update(siteIdBytes(siteId));
  h.update(clientIp, "utf8");
  h.update(SEP);
  h.update(userAgent, "utf8");
  return digestToInt64(h.digest());
}

/** Identified user: stable across days and devices, keyed by an app secret. */
export function userHash(
  secret: string,
  siteId: number | bigint,
  uid: string
): bigint {
  const h = createHmac("sha256", secret);
  h.update(siteIdBytes(siteId));
  h.update(uid, "utf8");
  return digestToInt64(h.digest());
}

/** Any legacy text id (session id, page view id) to a stable bigint. */
export function idFromText(kind: string, value: string): bigint {
  const h = createHash("sha256");
  h.update(kind, "utf8");
  h.update(SEP);
  h.update(value, "utf8");
  return digestToInt64(h.digest());
}

/** UTC calendar day of a timestamp, as YYYY-MM-DD. */
export function utcDay(ts: Date): string {
  return ts.toISOString().slice(0, 10);
}
