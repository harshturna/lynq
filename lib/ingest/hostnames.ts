/**
 * Hostname normalisation shared by site resolution and by whatever writes
 * site_hostnames. Mirrors analytics.normalise_hostname() in SQL; the unit
 * test holds the same examples for both.
 */
export function normaliseHostname(input: string): string | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // scheme
  s = s.replace(/^[^@]*@/, ""); // userinfo, never expected but harmless
  s = s.split(/[/?#]/)[0] ?? ""; // path, query, fragment
  s = s.replace(/:\d+$/, ""); // port
  s = s.replace(/\.+$/, ""); // trailing dot
  s = s.replace(/^www\./, "");
  if (!s || !/^[a-z0-9.-]+$/.test(s)) return null;
  return s;
}
