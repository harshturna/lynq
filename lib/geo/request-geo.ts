import { countryNameFromCode } from "./country-centroids";

type HeaderReader = { get(name: string): string | null };

export type RequestGeo = { country: string; city: string };

/**
 * Client address behind proxies. x-forwarded-for is "client, proxy1, proxy2";
 * the first entry is the client. Previously the whole header was passed to
 * the IP lookup, which fails behind any chain.
 */
export function getClientIp(headers: HeaderReader): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip")?.trim();
  return real || null;
}

function decode(value: string | null): string | null {
  if (!value) return null;
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded || null;
  } catch {
    return value.trim() || null;
  }
}

/**
 * Geo from the hosting platform's request headers. Vercel and Cloudflare both
 * resolve the client's location at the edge for free, so this needs no network
 * call and no third-party rate limit. Returns null when neither platform
 * header is present so the caller can fall back to an IP lookup.
 */
export function getGeoFromHeaders(headers: HeaderReader): RequestGeo | null {
  const code =
    headers.get("x-vercel-ip-country") ?? headers.get("cf-ipcountry");
  if (!code) return null;

  const country = countryNameFromCode(code) ?? "Unknown";
  const city =
    decode(headers.get("x-vercel-ip-city")) ??
    decode(headers.get("cf-ipcity")) ??
    "Unknown";

  return { country, city };
}
