/** Shared fixtures for the ingest tests. */
import type { ResolvedSite } from "./site-resolution";

export const SITE: ResolvedSite = {
  siteId: 31,
  hostnames: ["aivia.byharsh.com", "app.aivia.byharsh.com"],
  settings: {
    timezone: "UTC",
    store_titles: false,
    store_user_ids: false,
    excluded_ips: [],
    excluded_paths: [],
  },
};

export const CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export function batch(over: Record<string, unknown> = {}, now = Date.now()) {
  return {
    v: 2,
    site: "aivia.byharsh.com",
    sid: "8f3c1a2b3c4d5e6f",
    pid: "a91e0b1c2d3e4f50",
    page: {
      url: "https://aivia.byharsh.com/pricing?utm_source=x&session=SECRET",
      title: "Pricing",
    },
    session: {
      ref: "https://www.google.com/search?q=lynq",
      url: "https://aivia.byharsh.com/?utm_source=newsletter&utm_medium=email",
    },
    ctx: { sw: 1440, sh: 900, vw: 1280, vh: 720, lang: "en-GB" },
    events: [
      { t: "pageview", ts: now - 3000, seq: 1 },
      {
        t: "custom",
        ts: now - 2000,
        seq: 2,
        name: "signup",
        props: { plan: "pro", revenue: "4900", nested: { a: 1 } },
      },
      { t: "engagement", ts: now - 1000, seq: 3, ms: 65780, scroll: 72 },
      {
        t: "vitals",
        ts: now,
        seq: 4,
        m: { lcp: 1834, cls: 0.02, inp: 120, resources: 42, bogus: "x" },
        targets: { lcp: "img.hero" },
      },
    ],
    ...over,
  };
}

export function headers(over: Record<string, string> = {}) {
  const map: Record<string, string> = {
    origin: "https://aivia.byharsh.com",
    "user-agent": CHROME,
    "x-vercel-forwarded-for": "203.0.113.9",
    "x-vercel-ip-country": "CA",
    "x-vercel-ip-country-region": "MB",
    "x-vercel-ip-city": "Winnipeg",
    ...over,
  };
  return { get: (k: string) => map[k.toLowerCase()] ?? null };
}
