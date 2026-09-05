/**
 * Pure generator for demo traffic (TICKET-026). Produces tracker-v2-shaped
 * analytics.events rows for one site: sessions of pageviews with engagement,
 * vitals, custom events (some with revenue) and identify events, drawn from
 * hand-written distributions so the dashboard looks like a real product's
 * year. Deterministic for a given seed. Rows carry ingest_version 9 so a
 * later run can wipe exactly what this wrote.
 */
import { createHash } from "node:crypto";
import { en, Faker } from "@faker-js/faker";
import { idFromText, userHash, utcDay, visitorId } from "../../lib/ingest/hash";
import { classify } from "../../lib/ingest/referrers";
import type { EventRow } from "../../lib/ingest/rows";

export const SEED_INGEST_VERSION = 9;

export type SeedOptions = {
  siteId: number;
  hostname: string;
  days: number;
  /** Visitors per day at the start of the range; the year grows to ~3x. */
  visitorsPerDay: number;
  seed: number;
  /** Secret for user_hash; any string works for demo rows. */
  secret: string;
  /** End of the range, exclusive. Defaults to now. */
  until?: Date;
};

export type SeedStats = {
  rows: number;
  sessions: number;
  pageviews: number;
  engagement: number;
  vitals: number;
  custom: number;
  identify: number;
  revenue: number;
  bounced: number;
  firstDay: string;
  lastDay: string;
};

type W<T> = { weight: number; value: T };

type Country = {
  code: string;
  weight: number;
  lang: string;
  tz: number;
  regions: { code: string; cities: string[] }[];
};

const COUNTRIES: Country[] = [
  {
    code: "CA",
    weight: 28,
    lang: "en-CA",
    tz: -4,
    regions: [
      { code: "ON", cities: ["Toronto", "Ottawa", "Waterloo"] },
      { code: "BC", cities: ["Vancouver", "Victoria"] },
      { code: "QC", cities: ["Montreal", "Quebec City"] },
    ],
  },
  {
    code: "US",
    weight: 27,
    lang: "en-US",
    tz: -6,
    regions: [
      { code: "CA", cities: ["San Francisco", "Los Angeles", "San Diego"] },
      { code: "NY", cities: ["New York", "Brooklyn"] },
      { code: "TX", cities: ["Austin", "Dallas"] },
      { code: "WA", cities: ["Seattle"] },
    ],
  },
  {
    code: "IN",
    weight: 12,
    lang: "en-IN",
    tz: 5.5,
    regions: [
      { code: "MH", cities: ["Mumbai", "Pune"] },
      { code: "KA", cities: ["Bengaluru"] },
      { code: "DL", cities: ["New Delhi"] },
    ],
  },
  {
    code: "GB",
    weight: 7,
    lang: "en-GB",
    tz: 1,
    regions: [
      { code: "ENG", cities: ["London", "Manchester", "Bristol"] },
      { code: "SCT", cities: ["Edinburgh"] },
    ],
  },
  {
    code: "DE",
    weight: 5,
    lang: "de-DE",
    tz: 2,
    regions: [
      { code: "BE", cities: ["Berlin"] },
      { code: "BY", cities: ["Munich"] },
      { code: "HH", cities: ["Hamburg"] },
    ],
  },
  {
    code: "AU",
    weight: 3,
    lang: "en-AU",
    tz: 10,
    regions: [
      { code: "NSW", cities: ["Sydney"] },
      { code: "VIC", cities: ["Melbourne"] },
    ],
  },
  {
    code: "FR",
    weight: 3,
    lang: "fr-FR",
    tz: 2,
    regions: [
      { code: "IDF", cities: ["Paris"] },
      { code: "ARA", cities: ["Lyon"] },
    ],
  },
  {
    code: "NL",
    weight: 2.5,
    lang: "nl-NL",
    tz: 2,
    regions: [
      { code: "NH", cities: ["Amsterdam"] },
      { code: "UT", cities: ["Utrecht"] },
    ],
  },
  {
    code: "BR",
    weight: 2.5,
    lang: "pt-BR",
    tz: -3,
    regions: [
      { code: "SP", cities: ["São Paulo"] },
      { code: "RJ", cities: ["Rio de Janeiro"] },
    ],
  },
  {
    code: "JP",
    weight: 2,
    lang: "ja-JP",
    tz: 9,
    regions: [
      { code: "13", cities: ["Tokyo"] },
      { code: "27", cities: ["Osaka"] },
    ],
  },
  {
    code: "SG",
    weight: 1.5,
    lang: "en-SG",
    tz: 8,
    regions: [{ code: "01", cities: ["Singapore"] }],
  },
  {
    code: "ES",
    weight: 1.5,
    lang: "es-ES",
    tz: 2,
    regions: [
      { code: "MD", cities: ["Madrid"] },
      { code: "CT", cities: ["Barcelona"] },
    ],
  },
  {
    code: "SE",
    weight: 1.2,
    lang: "sv-SE",
    tz: 2,
    regions: [{ code: "AB", cities: ["Stockholm"] }],
  },
  {
    code: "PL",
    weight: 1.2,
    lang: "pl-PL",
    tz: 2,
    regions: [
      { code: "MZ", cities: ["Warsaw"] },
      { code: "MA", cities: ["Kraków"] },
    ],
  },
  {
    code: "NG",
    weight: 1,
    lang: "en-NG",
    tz: 1,
    regions: [{ code: "LA", cities: ["Lagos"] }],
  },
  {
    code: "MX",
    weight: 1,
    lang: "es-MX",
    tz: -6,
    regions: [{ code: "CMX", cities: ["Mexico City"] }],
  },
  {
    code: "KR",
    weight: 0.8,
    lang: "ko-KR",
    tz: 9,
    regions: [{ code: "11", cities: ["Seoul"] }],
  },
  {
    code: "IE",
    weight: 0.8,
    lang: "en-IE",
    tz: 1,
    regions: [{ code: "L", cities: ["Dublin"] }],
  },
];

type Device = "desktop" | "mobile" | "tablet";
const DEVICES: W<Device>[] = [
  { weight: 60, value: "desktop" },
  { weight: 34, value: "mobile" },
  { weight: 6, value: "tablet" },
];
const SCREENS: Record<Device, W<[number, number]>[]> = {
  desktop: [
    { weight: 30, value: [1920, 1080] },
    { weight: 25, value: [1440, 900] },
    { weight: 20, value: [1536, 864] },
    { weight: 12, value: [2560, 1440] },
    { weight: 8, value: [1366, 768] },
    { weight: 5, value: [1728, 1117] },
  ],
  mobile: [
    { weight: 40, value: [390, 844] },
    { weight: 25, value: [430, 932] },
    { weight: 20, value: [412, 915] },
    { weight: 15, value: [375, 812] },
  ],
  tablet: [
    { weight: 60, value: [820, 1180] },
    { weight: 40, value: [1024, 1366] },
  ],
};
type Browser = {
  browser: string;
  versions: string[];
  os: W<{ os: string; versions: string[] }>[];
};
const BROWSERS: Record<Device, W<Browser>[]> = {
  desktop: [
    {
      weight: 60,
      value: {
        browser: "Chrome",
        versions: ["128.0", "127.0", "126.0", "129.0"],
        os: [
          {
            weight: 50,
            value: { os: "Mac OS", versions: ["14.6", "15.0", "13.6"] },
          },
          { weight: 40, value: { os: "Windows", versions: ["10", "11"] } },
          { weight: 10, value: { os: "Linux", versions: [""] } },
        ],
      },
    },
    {
      weight: 16,
      value: {
        browser: "Safari",
        versions: ["17.6", "18.0", "17.5"],
        os: [
          { weight: 100, value: { os: "Mac OS", versions: ["14.6", "15.0"] } },
        ],
      },
    },
    {
      weight: 12,
      value: {
        browser: "Edge",
        versions: ["128.0", "127.0"],
        os: [
          { weight: 95, value: { os: "Windows", versions: ["11", "10"] } },
          { weight: 5, value: { os: "Mac OS", versions: ["14.6"] } },
        ],
      },
    },
    {
      weight: 9,
      value: {
        browser: "Firefox",
        versions: ["129.0", "130.0", "128.0"],
        os: [
          { weight: 45, value: { os: "Windows", versions: ["11", "10"] } },
          { weight: 30, value: { os: "Linux", versions: [""] } },
          { weight: 25, value: { os: "Mac OS", versions: ["14.6"] } },
        ],
      },
    },
    {
      weight: 3,
      value: {
        browser: "Arc",
        versions: ["1.58", "1.60"],
        os: [
          { weight: 100, value: { os: "Mac OS", versions: ["14.6", "15.0"] } },
        ],
      },
    },
  ],
  mobile: [
    {
      weight: 54,
      value: {
        browser: "Mobile Safari",
        versions: ["17.6", "18.0", "17.5"],
        os: [
          {
            weight: 100,
            value: { os: "iOS", versions: ["17.6", "18.0", "17.5"] },
          },
        ],
      },
    },
    {
      weight: 40,
      value: {
        browser: "Chrome",
        versions: ["128.0", "127.0"],
        os: [
          {
            weight: 92,
            value: { os: "Android", versions: ["14", "13", "15"] },
          },
          { weight: 8, value: { os: "iOS", versions: ["17.6"] } },
        ],
      },
    },
    {
      weight: 6,
      value: {
        browser: "Samsung Internet",
        versions: ["26.0", "25.0"],
        os: [{ weight: 100, value: { os: "Android", versions: ["14", "13"] } }],
      },
    },
  ],
  tablet: [
    {
      weight: 75,
      value: {
        browser: "Mobile Safari",
        versions: ["17.6", "18.0"],
        os: [{ weight: 100, value: { os: "iOS", versions: ["17.6", "18.0"] } }],
      },
    },
    {
      weight: 25,
      value: {
        browser: "Chrome",
        versions: ["128.0"],
        os: [{ weight: 100, value: { os: "Android", versions: ["14"] } }],
      },
    },
  ],
};

type Ref = {
  host: string;
  utm?: { utm_source: string; utm_medium: string; utm_campaign: string };
};
const REFERRERS: W<Ref>[] = [
  { weight: 33, value: { host: "" } },
  { weight: 29, value: { host: "google.com" } },
  { weight: 6, value: { host: "x.com" } },
  { weight: 5, value: { host: "github.com" } },
  { weight: 3.5, value: { host: "producthunt.com" } },
  { weight: 3, value: { host: "reddit.com" } },
  { weight: 3, value: { host: "linkedin.com" } },
  { weight: 2, value: { host: "news.ycombinator.com" } },
  { weight: 2, value: { host: "bing.com" } },
  { weight: 2, value: { host: "youtube.com" } },
  { weight: 1.5, value: { host: "chatgpt.com" } },
  { weight: 1, value: { host: "perplexity.ai" } },
  { weight: 1, value: { host: "duckduckgo.com" } },
  { weight: 1, value: { host: "dev.to" } },
  {
    weight: 4,
    value: {
      host: "",
      utm: {
        utm_source: "newsletter",
        utm_medium: "email",
        utm_campaign: "weekly-digest",
      },
    },
  },
  {
    weight: 2.5,
    value: {
      host: "google.com",
      utm: {
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "brand-search",
      },
    },
  },
  {
    weight: 1.5,
    value: {
      host: "x.com",
      utm: {
        utm_source: "twitter",
        utm_medium: "paid-social",
        utm_campaign: "launch-week",
      },
    },
  },
];

const ENTRY: W<string>[] = [
  { weight: 38, value: "/" },
  { weight: 12, value: "/pricing" },
  { weight: 8, value: "/docs/getting-started" },
  { weight: 4, value: "/docs/api" },
  { weight: 5, value: "/blog/what-we-learned-shipping-ai-agents" },
  { weight: 4, value: "/blog/prompt-caching-in-practice" },
  { weight: 3, value: "/blog/aivia-1-0" },
  { weight: 3, value: "/blog/evals-are-your-product" },
  { weight: 5, value: "/features" },
  { weight: 3, value: "/changelog" },
  { weight: 6, value: "/login" },
  { weight: 4, value: "/signup" },
  { weight: 2, value: "/docs/integrations" },
  { weight: 1.5, value: "/docs/self-hosting" },
  { weight: 1.5, value: "/customers" },
];
const NEXT: Record<string, W<string>[]> = {
  "/": [
    { weight: 30, value: "/pricing" },
    { weight: 22, value: "/docs/getting-started" },
    { weight: 16, value: "/features" },
    { weight: 12, value: "/signup" },
    { weight: 10, value: "/login" },
    { weight: 6, value: "/customers" },
    { weight: 4, value: "/blog/aivia-1-0" },
  ],
  "/pricing": [
    { weight: 36, value: "/signup" },
    { weight: 20, value: "/docs/getting-started" },
    { weight: 18, value: "/" },
    { weight: 14, value: "/features" },
    { weight: 12, value: "/customers" },
  ],
  "/features": [
    { weight: 40, value: "/pricing" },
    { weight: 25, value: "/docs/getting-started" },
    { weight: 20, value: "/signup" },
    { weight: 15, value: "/" },
  ],
  "/signup": [
    { weight: 70, value: "/dashboard" },
    { weight: 20, value: "/pricing" },
    { weight: 10, value: "/docs/getting-started" },
  ],
  "/login": [
    { weight: 85, value: "/dashboard" },
    { weight: 15, value: "/" },
  ],
  "/dashboard": [
    { weight: 40, value: "/dashboard/agents" },
    { weight: 30, value: "/dashboard/settings" },
    { weight: 20, value: "/docs/api" },
    { weight: 10, value: "/pricing" },
  ],
  "/dashboard/agents": [
    { weight: 50, value: "/dashboard/agents/new" },
    { weight: 30, value: "/dashboard" },
    { weight: 20, value: "/docs/api" },
  ],
  "/docs/getting-started": [
    { weight: 35, value: "/docs/api" },
    { weight: 25, value: "/docs/integrations" },
    { weight: 20, value: "/signup" },
    { weight: 10, value: "/pricing" },
    { weight: 10, value: "/docs/self-hosting" },
  ],
  "/docs/api": [
    { weight: 40, value: "/docs/integrations" },
    { weight: 30, value: "/docs/getting-started" },
    { weight: 15, value: "/dashboard" },
    { weight: 15, value: "/pricing" },
  ],
  "/changelog": [
    { weight: 50, value: "/" },
    { weight: 30, value: "/docs/getting-started" },
    { weight: 20, value: "/pricing" },
  ],
};
const BLOG_NEXT: W<string>[] = [
  { weight: 45, value: "/" },
  { weight: 25, value: "/pricing" },
  { weight: 15, value: "/docs/getting-started" },
  { weight: 15, value: "/blog/prompt-caching-in-practice" },
];

/** Local-hour weights: quiet nights, a late-morning peak and an afternoon plateau. */
const HOURS = [
  1, 0.6, 0.4, 0.3, 0.3, 0.5, 1, 2, 3.5, 5, 6, 6, 5.5, 5.5, 6, 6, 5.5, 4.5, 3.5,
  3, 2.8, 2.5, 2, 1.5,
];
const PAGEVIEWS: W<number>[] = [
  { weight: 38, value: 1 },
  { weight: 25, value: 2 },
  { weight: 16, value: 3 },
  { weight: 10, value: 4 },
  { weight: 7, value: 5 },
  { weight: 4, value: 6 },
];
const PLANS: W<{ plan: string; price: number }>[] = [
  { weight: 55, value: { plan: "starter", price: 19 } },
  { weight: 35, value: { plan: "pro", price: 49 } },
  { weight: 10, value: { plan: "team", price: 199 } },
];

const DAY_MS = 86_400_000;

function daySalt(seed: number, day: string): Buffer {
  return createHash("sha256").update(`lynq-seed-${seed}-${day}`).digest();
}

/** Log-normal-ish sample around a median with a multiplicative spread. */
function around(f: Faker, median: number, spread: number): number {
  const z =
    f.number.float({ min: -1, max: 1 }) + f.number.float({ min: -1, max: 1 });
  return median * spread ** z;
}

export function generate(opts: SeedOptions): {
  rows: EventRow[];
  stats: SeedStats;
} {
  const f = new Faker({ locale: [en] });
  f.seed(opts.seed);
  const pick = <T>(list: W<T>[]): T => f.helpers.weightedArrayElement(list);
  const until = opts.until ?? new Date();
  const start = new Date(
    Math.floor(until.getTime() / DAY_MS) * DAY_MS - opts.days * DAY_MS
  );
  const rows: EventRow[] = [];
  const stats: SeedStats = {
    rows: 0,
    sessions: 0,
    pageviews: 0,
    engagement: 0,
    vitals: 0,
    custom: 0,
    identify: 0,
    revenue: 0,
    bounced: 0,
    firstDay: utcDay(start),
    lastDay: utcDay(new Date(until.getTime() - 1)),
  };

  // A pool of identified users who come back across days on the same device.
  const users = Array.from(
    { length: Math.max(40, Math.round(opts.visitorsPerDay * 6)) },
    () => ({
      uid: f.string.uuid(),
      country: pick(COUNTRIES.map((c) => ({ weight: c.weight, value: c }))),
      device: pick(DEVICES),
      ip: f.internet.ipv4(),
    })
  );

  // Two launch spikes, decaying over a few days.
  const launches = [Math.floor(opts.days * 0.38), Math.floor(opts.days * 0.72)];
  const spike = (d: number) =>
    launches.reduce(
      (m, l) =>
        d >= l && d < l + 4 ? Math.max(m, [4, 2.2, 1.5, 1.2][d - l]) : m,
      1
    );

  const blank = (base: Partial<EventRow>): EventRow => ({
    site_id: opts.siteId,
    ts: new Date(0),
    received_at: new Date(0),
    seq: 0,
    event: "pageview",
    name: "",
    visitor_id: BigInt(0),
    session_id: BigInt(0),
    user_hash: BigInt(0),
    pageview_id: BigInt(0),
    hostname: opts.hostname,
    path: "/",
    title: "",
    query: "",
    referrer: "",
    referrer_url: "",
    source: "",
    channel: "Direct",
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
    country: "",
    region: "",
    city: "",
    device: "desktop",
    browser: "",
    browser_major: 0,
    browser_version: "",
    os: "",
    os_version: "",
    screen_width: 0,
    screen_height: 0,
    viewport_width: 0,
    viewport_height: 0,
    language: "",
    engaged_ms: 0,
    scroll_depth: 0,
    props: {},
    revenue: null,
    lcp: null,
    cls: null,
    inp: null,
    fcp: null,
    ttfb: null,
    dcl: null,
    load: null,
    tti: null,
    tbt: null,
    resources: null,
    lcp_target: null,
    inp_target: null,
    suspect: false,
    ingest_version: SEED_INGEST_VERSION,
    ...base,
  });

  // `days` full days plus today up to `until`, so the 24-hour view has traffic too.
  for (let d = 0; d <= opts.days; d++) {
    const dayStart = new Date(start.getTime() + d * DAY_MS);
    if (dayStart >= until) break;
    const day = utcDay(dayStart);
    const salt = daySalt(opts.seed, day);
    const weekday = dayStart.getUTCDay();
    const growth = 1 + 2 * (d / Math.max(1, opts.days - 1));
    const weekend = weekday === 0 || weekday === 6 ? 0.55 : 1;
    const noise = f.number.float({ min: 0.8, max: 1.25 });
    const visitors = Math.max(
      1,
      Math.round(opts.visitorsPerDay * growth * weekend * noise * spike(d))
    );

    for (let v = 0; v < visitors; v++) {
      const returning = f.number.float({ min: 0, max: 1 }) < 0.08;
      const user = returning ? f.helpers.arrayElement(users) : null;
      const country =
        user?.country ??
        pick(COUNTRIES.map((c) => ({ weight: c.weight, value: c })));
      const region = f.helpers.arrayElement(country.regions);
      const city = f.helpers.arrayElement(region.cities);
      const device = user?.device ?? pick(DEVICES);
      const b = pick(BROWSERS[device]);
      const osPick = pick(b.os);
      const browserVersion = f.helpers.arrayElement(b.versions);
      const osVersion = f.helpers.arrayElement(osPick.versions);
      const [sw, sh] = pick(SCREENS[device]);
      // The viewport is what the histogram measures (design §8.6): browser
      // chrome and a window that is not always maximised on desktop.
      const [vw, vh] =
        device === "desktop"
          ? [
              sw - f.number.int({ min: 0, max: 140 }),
              sh - f.number.int({ min: 90, max: 180 }),
            ]
          : [sw, sh];
      const ip = user?.ip ?? f.internet.ipv4();
      const ua = `${b.browser}/${browserVersion} (${osPick.os} ${osVersion}; ${device})`;
      const visitor = visitorId(salt, opts.siteId, ip, ua);
      const uhash = user
        ? userHash(opts.secret, opts.siteId, user.uid)
        : BigInt(0);

      // Local hour drawn from the curve, shifted to UTC by the country's offset.
      const hour = pick(HOURS.map((w, h) => ({ weight: w, value: h })));
      let ts = new Date(
        dayStart.getTime() +
          ((hour - country.tz + 24) % 24) * 3_600_000 +
          f.number.int({ min: 0, max: 3_599_999 })
      );
      if (ts >= until)
        ts = new Date(
          until.getTime() - f.number.int({ min: 1000, max: 600_000 })
        );

      const ref = pick(REFERRERS);
      const utm = {
        utm_source: ref.utm?.utm_source ?? "",
        utm_medium: ref.utm?.utm_medium ?? "",
        utm_campaign: ref.utm?.utm_campaign ?? "",
        utm_term: "",
        utm_content: "",
      };
      const cls = classify(ref.host, utm);
      const sessionId = idFromText("session", f.string.uuid());
      const n = user ? Math.min(6, pick(PAGEVIEWS) + 1) : pick(PAGEVIEWS);
      let seq = 0;
      let path = user
        ? f.number.float({ min: 0, max: 1 }) < 0.6
          ? "/login"
          : pick(ENTRY)
        : pick(ENTRY);
      let signedUp = false;
      let sessionEngaged = 0;
      let sessionCustom = 0;
      const common = {
        visitor_id: visitor,
        session_id: sessionId,
        user_hash: uhash,
        country: country.code,
        region: region.code,
        city,
        device,
        browser: b.browser,
        browser_major: Number.parseInt(browserVersion, 10) || 0,
        browser_version: browserVersion,
        os: osPick.os,
        os_version: osVersion,
        screen_width: sw,
        screen_height: sh,
        viewport_width: vw,
        viewport_height: vh,
        language: country.lang,
      };
      const push = (r: EventRow) => {
        // Engagement, vitals and custom rows trail the pageview; keep them inside the range.
        if (r.ts >= until) {
          r.ts = new Date(until.getTime() - 1);
          r.received_at = new Date(until.getTime() + 500);
        }
        rows.push(r);
        stats.rows++;
      };
      const stamp = (t: Date) => ({
        ts: t,
        received_at: new Date(
          t.getTime() + f.number.int({ min: 150, max: 1500 })
        ),
      });

      for (let p = 0; p < n; p++) {
        const pageviewId = idFromText("pageview", f.string.uuid());
        const first = p === 0;
        const entry = first
          ? {
              referrer: ref.host,
              referrer_url: ref.host ? `https://${ref.host}/` : "",
              source: cls.source,
              channel: cls.channel,
              ...utm,
            }
          : {};
        push(
          blank({
            ...stamp(ts),
            seq: ++seq,
            event: "pageview",
            pageview_id: pageviewId,
            path,
            ...common,
            ...entry,
          })
        );
        stats.pageviews++;

        // Engagement: how long the tab was visible on this page.
        const bounceish = n === 1 && f.number.float({ min: 0, max: 1 }) < 0.55;
        const engaged = Math.round(
          bounceish
            ? f.number.int({ min: 800, max: 9_000 })
            : around(
                f,
                path.startsWith("/docs") || path.startsWith("/blog")
                  ? 75_000
                  : 28_000,
                2.2
              )
        );
        sessionEngaged += engaged;
        const scroll = Math.min(
          100,
          Math.round(
            engaged < 5000
              ? f.number.int({ min: 5, max: 40 })
              : f.number.int({ min: 30, max: 100 })
          )
        );
        const endTs = new Date(ts.getTime() + engaged);
        push(
          blank({
            ...stamp(endTs),
            seq: ++seq,
            event: "engagement",
            pageview_id: pageviewId,
            path,
            ...common,
            engaged_ms: engaged,
            scroll_depth: scroll,
          })
        );
        stats.engagement++;

        // Web Vitals on most page loads; mobile is slower and noisier.
        if (f.number.float({ min: 0, max: 1 }) < 0.65) {
          const mobile = device !== "desktop";
          const lcp = Math.round(around(f, mobile ? 2600 : 1400, 1.7));
          const inpValue =
            f.number.float({ min: 0, max: 1 }) < 0.8
              ? Math.round(around(f, mobile ? 230 : 120, 1.8))
              : null;
          const clsValue =
            f.number.float({ min: 0, max: 1 }) < 0.85
              ? Number(around(f, 0.03, 2.5).toFixed(3))
              : Number(around(f, 0.3, 1.4).toFixed(3));
          const ttfb = Math.round(around(f, mobile ? 520 : 260, 1.6));
          const fcp = Math.round(ttfb + around(f, mobile ? 900 : 550, 1.5));
          push(
            blank({
              ...stamp(
                new Date(ts.getTime() + f.number.int({ min: 1500, max: 6000 }))
              ),
              seq: ++seq,
              event: "vitals",
              pageview_id: pageviewId,
              path,
              ...common,
              lcp,
              cls: clsValue,
              inp: inpValue,
              fcp,
              ttfb,
              dcl: Math.round(fcp + around(f, 200, 1.4)),
              load: Math.round(lcp + around(f, 600, 1.5)),
              tti: Math.round(fcp + around(f, 400, 1.6)),
              tbt: Math.round(around(f, mobile ? 180 : 60, 2)),
              resources: f.number.int({ min: 18, max: 95 }),
              lcp_target:
                path === "/"
                  ? "img.hero"
                  : path.startsWith("/blog")
                    ? "img.cover"
                    : "h1",
              inp_target: inpValue
                ? path === "/pricing"
                  ? "button.checkout"
                  : path === "/"
                    ? "button.signup"
                    : "a.nav"
                : null,
            })
          );
          stats.vitals++;
        }

        // Custom events, by page.
        const custom = (
          name: string,
          props: Record<string, string>,
          revenue: number | null = null
        ) => {
          push(
            blank({
              ...stamp(
                new Date(
                  ts.getTime() +
                    f.number.int({ min: 2000, max: Math.max(2500, engaged) })
                )
              ),
              seq: ++seq,
              event: "custom",
              name,
              pageview_id: pageviewId,
              path,
              ...common,
              props,
              revenue: revenue === null ? null : revenue.toFixed(2),
            })
          );
          stats.custom++;
          sessionCustom++;
          if (revenue) stats.revenue += revenue;
        };
        const roll = f.number.float({ min: 0, max: 1 });
        if (path === "/" && roll < 0.1)
          custom("video_play", { video: "product-tour" });
        else if (path === "/pricing" && roll < 0.07)
          custom("checkout_start", { plan: pick(PLANS).plan });
        else if (path === "/signup" && roll < 0.42 && !signedUp) {
          custom("signup_start", {
            method: f.helpers.arrayElement(["email", "github", "google"]),
          });
          if (f.number.float({ min: 0, max: 1 }) < 0.7) {
            const plan = pick(PLANS);
            custom("signup", { plan: plan.plan });
            signedUp = true;
            if (f.number.float({ min: 0, max: 1 }) < 0.14)
              custom(
                "purchase",
                { plan: plan.plan, currency: "USD", interval: "month" },
                plan.price
              );
          }
        } else if (path.startsWith("/blog") && roll < 0.08)
          custom("outbound_click", {
            url: f.helpers.arrayElement([
              "https://github.com/aivia-ai/aivia",
              "https://x.com/aivia_ai",
              "https://arxiv.org/abs/2305.10601",
            ]),
          });
        else if (path.startsWith("/docs") && roll < 0.03)
          custom("download", {
            file: f.helpers.arrayElement([
              "aivia-cli-mac.zip",
              "aivia-cli-linux.tar.gz",
              "openapi.json",
            ]),
          });
        else if (path.startsWith("/dashboard/agents/new") && roll < 0.5)
          custom("agent_created", {
            template: f.helpers.arrayElement(["support", "research", "blank"]),
          });

        // Identify once per session for known users, right after the first pageview.
        if (first && user) {
          push(
            blank({
              ...stamp(new Date(ts.getTime() + 300)),
              seq: ++seq,
              event: "identify",
              pageview_id: pageviewId,
              path,
              ...common,
            })
          );
          stats.identify++;
        }

        // Next page.
        ts = new Date(endTs.getTime() + f.number.int({ min: 800, max: 5000 }));
        if (ts >= until) break;
        const next =
          NEXT[path] ??
          (path.startsWith("/blog")
            ? BLOG_NEXT
            : path.startsWith("/docs")
              ? NEXT["/docs/api"]
              : NEXT["/"]);
        path = pick(next);
      }
      stats.sessions++;
      if (n === 1 && sessionEngaged < 10_000 && sessionCustom === 0)
        stats.bounced++;
    }
  }
  return { rows, stats };
}
