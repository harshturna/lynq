/**
 * Pure generator for demo crawler traffic (TICKET-075, D-018): daily
 * `analytics.crawler_days` rows for one site, drawn from hand-written
 * crawler and page distributions so the Bots screen looks like a real
 * site's month. Deterministic for a given seed. Rows are what the
 * middleware snippet would have reported, already folded per day.
 */
import { en, Faker } from "@faker-js/faker";
import type { Family } from "../../lib/crawler-families";
import type { CrawlerDayRow } from "../../lib/ingest/bots";
import { utcDay } from "../../lib/ingest/hash";

export type CrawlerSeedOptions = {
  siteId: number;
  days: number;
  seed: number;
  /** Multiplies every crawler's daily rate; 1 suits a small docs site. */
  scale?: number;
  /** End of the range, exclusive. Defaults to now. */
  until?: Date;
};

type CrawlerSpec = {
  name: string;
  family: Family;
  /** Median page fetches per day. */
  perDay: number;
  /** Which orientation files it reads, and how often per day. */
  robots: number;
  llms: number;
  sitemap: number;
};

const CRAWLERS: CrawlerSpec[] = [
  {
    name: "ChatGPT-User",
    family: "answers",
    perDay: 20,
    robots: 0.3,
    llms: 0.4,
    sitemap: 0,
  },
  {
    name: "PerplexityBot",
    family: "answers",
    perDay: 11,
    robots: 0.5,
    llms: 0.5,
    sitemap: 0.1,
  },
  {
    name: "Claude-User",
    family: "answers",
    perDay: 6,
    robots: 0.2,
    llms: 0.3,
    sitemap: 0,
  },
  {
    name: "OAI-SearchBot",
    family: "answers",
    perDay: 4,
    robots: 0.4,
    llms: 0.2,
    sitemap: 0.3,
  },
  {
    name: "GPTBot",
    family: "training",
    perDay: 14,
    robots: 1,
    llms: 0.2,
    sitemap: 0.4,
  },
  {
    name: "ClaudeBot",
    family: "training",
    perDay: 10,
    robots: 1,
    llms: 0.3,
    sitemap: 0.3,
  },
  {
    name: "CCBot",
    family: "training",
    perDay: 4,
    robots: 0.6,
    llms: 0,
    sitemap: 0.1,
  },
  {
    name: "Bytespider",
    family: "training",
    perDay: 3,
    robots: 0.2,
    llms: 0,
    sitemap: 0,
  },
  {
    name: "Googlebot",
    family: "search",
    perDay: 18,
    robots: 1.2,
    llms: 0,
    sitemap: 0.6,
  },
  {
    name: "bingbot",
    family: "search",
    perDay: 6,
    robots: 0.9,
    llms: 0,
    sitemap: 0.4,
  },
  {
    name: "Applebot",
    family: "search",
    perDay: 1.5,
    robots: 0.3,
    llms: 0,
    sitemap: 0.1,
  },
  {
    name: "DuckDuckBot",
    family: "search",
    perDay: 0.8,
    robots: 0.2,
    llms: 0,
    sitemap: 0,
  },
  {
    name: "Slackbot",
    family: "social",
    perDay: 4,
    robots: 0,
    llms: 0,
    sitemap: 0,
  },
  {
    name: "Twitterbot",
    family: "social",
    perDay: 1.5,
    robots: 0,
    llms: 0,
    sitemap: 0,
  },
  {
    name: "LinkedInBot",
    family: "social",
    perDay: 1,
    robots: 0,
    llms: 0,
    sitemap: 0,
  },
  {
    name: "Discordbot",
    family: "social",
    perDay: 0.7,
    robots: 0,
    llms: 0,
    sitemap: 0,
  },
  {
    name: "AhrefsBot",
    family: "seo",
    perDay: 3.5,
    robots: 0.8,
    llms: 0,
    sitemap: 0.2,
  },
  {
    name: "SemrushBot",
    family: "seo",
    perDay: 2,
    robots: 0.6,
    llms: 0,
    sitemap: 0.1,
  },
  {
    name: "UptimeRobot",
    family: "other",
    perDay: 1,
    robots: 0,
    llms: 0,
    sitemap: 0,
  },
];

/** Pages weighted by how much crawlers want them; docs and blog first. */
const PAGES: { weight: number; value: string }[] = [
  { weight: 30, value: "/" },
  { weight: 24, value: "/docs/getting-started" },
  { weight: 16, value: "/docs/api" },
  { weight: 12, value: "/docs/integrations" },
  { weight: 7, value: "/docs/self-hosting" },
  { weight: 14, value: "/pricing" },
  { weight: 10, value: "/features" },
  { weight: 12, value: "/blog/what-we-learned-shipping-ai-agents" },
  { weight: 10, value: "/blog/prompt-caching-in-practice" },
  { weight: 7, value: "/blog/aivia-1-0" },
  { weight: 8, value: "/blog/evals-are-your-product" },
  { weight: 5, value: "/changelog" },
  { weight: 4, value: "/customers" },
  { weight: 3, value: "/about" },
  { weight: 3, value: "/login" },
  { weight: 2, value: "/signup" },
];

const DAY_MS = 86_400_000;

export function generateCrawlerDays(opts: CrawlerSeedOptions): CrawlerDayRow[] {
  const f = new Faker({ locale: [en] });
  f.seed(opts.seed);
  const scale = opts.scale ?? 1;
  const until = opts.until ?? new Date();
  const start =
    Math.floor(until.getTime() / DAY_MS) * DAY_MS - opts.days * DAY_MS;
  const rows = new Map<string, CrawlerDayRow>();
  const add = (
    day: string,
    dayStart: number,
    c: CrawlerSpec,
    path: string,
    n: number
  ) => {
    if (n <= 0) return;
    const id = `${day}\n${c.name}\n${path}`;
    const row = rows.get(id);
    const last = new Date(
      Math.min(
        until.getTime() - 1,
        dayStart + f.number.int({ min: 0, max: DAY_MS - 1 })
      )
    );
    if (row) {
      row.hits += n;
      if (last > row.last_seen) row.last_seen = last;
    } else {
      rows.set(id, {
        site_id: opts.siteId,
        day,
        crawler: c.name,
        family: c.family,
        path,
        hits: n,
        last_status: f.number.int({ min: 1, max: 20 }) === 1 ? 404 : 200,
        last_seen: last,
      });
    }
  };
  for (let d = 0; d <= opts.days; d++) {
    const dayStart = start + d * DAY_MS;
    if (dayStart >= until.getTime()) break;
    const day = utcDay(new Date(dayStart));
    // Crawlers come in bursts: some days a crawler walks the site, most it samples.
    for (const c of CRAWLERS) {
      const burst = f.number.int({ min: 1, max: 12 }) === 1 ? 4 : 1;
      const fetches = Math.round(
        c.perDay * scale * burst * f.number.float({ min: 0.4, max: 1.6 })
      );
      for (let i = 0; i < fetches; i++)
        add(day, dayStart, c, f.helpers.weightedArrayElement(PAGES), 1);
      const times = (rate: number) =>
        rate <= 0
          ? 0
          : f.number.float({ min: 0, max: 1 }) < rate
            ? 1 + (burst > 1 ? 1 : 0)
            : 0;
      add(day, dayStart, c, "robots.txt", times(c.robots));
      add(day, dayStart, c, "llms.txt", times(c.llms));
      add(day, dayStart, c, "sitemap", times(c.sitemap));
    }
  }
  return [...rows.values()];
}

export const CRAWLER_DAY_COLUMNS = [
  "site_id",
  "day",
  "crawler",
  "family",
  "path",
  "hits",
  "last_status",
  "last_seen",
] as const;
