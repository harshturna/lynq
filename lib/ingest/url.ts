import { normaliseHostname } from "./hostnames";

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
const CONTROL_CHARS = /[\x00-\x1f\x7f-\x9f]/g;

/** Strip C0 and C1 control characters and cap the length. */
export function cleanText(
  value: string | null | undefined,
  max: number
): string {
  if (!value) return "";
  const stripped = value.replace(CONTROL_CHARS, "");
  return stripped.length > max ? stripped.slice(0, max) : stripped;
}

const KEPT_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
];

export type ParsedPage = {
  hostname: string;
  path: string;
  query: string;
};

export type Utm = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
};

const EMPTY_UTM: Utm = {
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
};

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

/** Path without the query string, plus the allow-listed params only (§7.3). */
export function parsePageUrl(value: string): ParsedPage | null {
  const url = safeUrl(value);
  if (!url) return null;
  const hostname = normaliseHostname(url.hostname);
  if (!hostname) return null;
  const kept = new URLSearchParams();
  for (const key of KEPT_PARAMS) {
    const v = url.searchParams.get(key);
    if (v) kept.set(key, cleanText(v, 256));
  }
  return {
    hostname,
    path: cleanText(url.pathname || "/", 2048),
    query: kept.toString(),
  };
}

export function parseUtm(value: string | undefined): Utm {
  const url = value ? safeUrl(value) : null;
  if (!url) return { ...EMPTY_UTM };
  const get = (k: keyof Utm) => cleanText(url.searchParams.get(k), 256);
  return {
    utm_source: get("utm_source"),
    utm_medium: get("utm_medium"),
    utm_campaign: get("utm_campaign"),
    utm_term: get("utm_term"),
    utm_content: get("utm_content"),
  };
}

export type ParsedReferrer = { referrer: string; referrer_url: string };

/**
 * The session's entry referrer (§7.4). A referrer on one of the site's own
 * hostnames is internal navigation and yields ''. The stored url is the
 * origin plus path, never the query string.
 */
export function parseReferrer(
  value: string | undefined,
  siteHostnames: string[]
): ParsedReferrer {
  const url = value ? safeUrl(value) : null;
  if (!url) return { referrer: "", referrer_url: "" };
  const host = normaliseHostname(url.hostname);
  if (!host || siteHostnames.includes(host))
    return { referrer: "", referrer_url: "" };
  return {
    referrer: host,
    referrer_url: cleanText(`${url.origin}${url.pathname}`, 2048),
  };
}
