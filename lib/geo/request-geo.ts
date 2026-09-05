import { countryNameFromCode } from "./country-centroids";

type HeaderReader = { get(name: string): string | null };

export type RequestGeo = { country: string; city: string };

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

export type GeoCodes = { country: string; region: string; city: string };

/**
 * The same headers as ISO codes for the v2 event store (design §4): the
 * alpha-2 country, the platform's region code, and the city. Unknown and
 * placeholder codes (XX, T1) become ''.
 */
export function getGeoCodesFromHeaders(headers: HeaderReader): GeoCodes {
  const raw = (
    headers.get("x-vercel-ip-country") ??
    headers.get("cf-ipcountry") ??
    ""
  )
    .trim()
    .toUpperCase();
  const country =
    /^[A-Z]{2}$/.test(raw) && raw !== "XX" && raw !== "T1" ? raw : "";
  return {
    country,
    region: decode(headers.get("x-vercel-ip-country-region")) ?? "",
    city:
      decode(headers.get("x-vercel-ip-city")) ??
      decode(headers.get("cf-ipcity")) ??
      "",
  };
}
