type HeaderReader = { get(name: string): string | null };

/**
 * The client address, from headers the platform sets and a client cannot
 * influence (design §5.1). x-forwarded-for is never read: its first entry is
 * whatever the client sent, and an id derived from it could be minted at will.
 */
export function getClientIp(headers: HeaderReader): string | null {
  for (const name of ["x-vercel-forwarded-for", "x-real-ip"]) {
    const value = headers.get(name);
    if (!value) continue;
    const first = value.split(",")[0]?.trim();
    if (first) return first;
  }
  return null;
}
