import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { isScope, type Scope } from "./api-key-scopes";

/**
 * Per-site API keys (D-017), for callers that are not a browser: a
 * server-side middleware reporting crawler hits, a deploy pipeline writing a
 * note, an agent reading analytics. The browser tracker stays unauthenticated
 * by design; this is a separate path, never a replacement.
 *
 * Only the SHA-256 of a token is stored, so a leaked database is not a set of
 * leaked keys. The token is returned once, at creation.
 */
const PREFIX = "lynq_sk_";
const BYTES = 24;
/** Enough of the token to tell two keys apart in a list, not enough to use. */
const SHOWN = PREFIX.length + 8;

export function generateToken(): { token: string; prefix: string } {
  const token = PREFIX + randomBytes(BYTES).toString("hex");
  return { token, prefix: token.slice(0, SHOWN) };
}

export function hashToken(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

export type ResolvedKey = {
  keyId: number;
  siteId: number;
  scopes: Scope[];
  /** The key's display name; a note written through a key is signed with it. */
  name: string;
};

/**
 * A token to its site and scopes, or null. A revoked key resolves to nothing.
 * The comparison is on the hash, which is unique and indexed; the constant
 * time check guards the equality itself out of habit rather than need.
 */
export async function resolveApiKey(
  token: string | null | undefined
): Promise<ResolvedKey | null> {
  if (!token || !token.startsWith(PREFIX)) return null;
  // imported here, not at the top, so the token helpers above can be tested
  // without a database connection
  const { sql } = await import("@/lib/db");
  const hash = hashToken(token);
  const [row] = await sql<
    {
      id: number;
      site_id: number;
      scopes: string[];
      token_hash: Buffer;
      name: string;
    }[]
  >`
    select id, site_id, scopes, token_hash, name
    from analytics.api_keys
    where token_hash = ${hash} and revoked_at is null
    limit 1`;
  if (!row) return null;
  if (
    row.token_hash.length !== hash.length ||
    !timingSafeEqual(row.token_hash, hash)
  )
    return null;
  // A stamp per request would be a write on every call; a coarse one is enough
  // to answer "is this key still in use".
  void sql`
    update analytics.api_keys set last_used_at = now()
    where id = ${row.id}
      and (last_used_at is null or last_used_at < now() - interval '1 hour')`.catch(
    () => {}
  );
  return {
    keyId: Number(row.id),
    siteId: Number(row.site_id),
    scopes: row.scopes.filter(isScope),
    name: row.name,
  };
}

/** The bearer token of a request, or null. */
export function bearerToken(headers: {
  get(name: string): string | null;
}): string | null {
  const raw = headers.get("authorization");
  if (!raw) return null;
  const [scheme, ...rest] = raw.split(" ");
  if (scheme.toLowerCase() !== "bearer") return null;
  const token = rest.join(" ").trim();
  return token || null;
}

export function hasScope(key: ResolvedKey, scope: Scope): boolean {
  return key.scopes.includes(scope);
}

export { isScope, SCOPE_LABEL, SCOPES, type Scope } from "./api-key-scopes";
