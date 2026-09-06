import { isbot } from "isbot";
import type { Family } from "@/lib/crawler-families";

/**
 * User agent to a crawler name and a family (design docs/design/bot-traffic.md
 * §5, D-018). A hand-written list beside the referrer map, for the same
 * reason: classification happens here, at the collector, so a crawler that
 * appears after a customer installed the middleware snippet is not missed
 * until they upgrade.
 *
 * The name is what the crawler claimed. v1 does no reverse-DNS check, and the
 * docs say so.
 */
export {
  FAMILIES,
  FAMILY_LABEL,
  type Family,
  isFamily,
  isOrientation,
  ORIENTATION,
  type Orientation,
} from "@/lib/crawler-families";

export type Crawler = { crawler: string; family: Family };

type Entry = [name: string, family: Family, match: RegExp];

/** Fetching a page now, to answer someone. */
const ANSWERS: Family = "answers";
/** Collecting pages for a model. */
const TRAINING: Family = "training";
const SEARCH: Family = "search";
/** Link unfurling in a chat or a feed. */
const SOCIAL: Family = "social";
/** Third-party crawlers that sell what they find. */
const SEO: Family = "seo";
const OTHER: Family = "other";

// Order matters only where one token contains another; the specific one is
// listed first. Every pattern is anchored on a token boundary so ChatGPT-User
// does not read as GPTBot.
const KNOWN: Entry[] = [
  // OpenAI
  ["ChatGPT-User", ANSWERS, /\bChatGPT-User\b/i],
  ["OAI-SearchBot", ANSWERS, /\bOAI-SearchBot\b/i],
  ["GPTBot", TRAINING, /\bGPTBot\b/i],
  // Anthropic
  ["Claude-User", ANSWERS, /\bClaude-User\b/i],
  ["Claude-SearchBot", ANSWERS, /\bClaude-SearchBot\b/i],
  ["ClaudeBot", TRAINING, /\bClaudeBot\b/i],
  ["anthropic-ai", TRAINING, /\banthropic-ai\b/i],
  // Perplexity
  ["Perplexity-User", ANSWERS, /\bPerplexity-User\b/i],
  ["PerplexityBot", ANSWERS, /\bPerplexityBot\b/i],
  // Google: Gemini grounding fetches under Vertex; classic search under Googlebot
  ["Google-CloudVertexBot", ANSWERS, /\bGoogle-CloudVertexBot\b/i],
  ["Googlebot", SEARCH, /\bGooglebot\b/i],
  ["Google-InspectionTool", SEARCH, /\bGoogle-InspectionTool\b/i],
  ["Storebot-Google", SEARCH, /\bStorebot-Google\b/i],
  ["AdsBot-Google", SEARCH, /\bAdsBot-Google\b/i],
  ["Mediapartners-Google", SEARCH, /\bMediapartners-Google\b/i],
  ["GoogleOther", TRAINING, /\bGoogleOther\b/i],
  // Microsoft
  ["bingbot", SEARCH, /\bbingbot\b/i],
  ["BingPreview", SOCIAL, /\bBingPreview\b/i],
  // Meta
  ["meta-externalfetcher", ANSWERS, /\bmeta-externalfetcher\b/i],
  ["Meta-ExternalAgent", TRAINING, /\bMeta-ExternalAgent\b/i],
  ["facebookexternalhit", SOCIAL, /\bfacebookexternalhit\b/i],
  ["facebookcatalog", SOCIAL, /\bfacebookcatalog\b/i],
  // Other answer engines
  ["DuckAssistBot", ANSWERS, /\bDuckAssistBot\b/i],
  ["MistralAI-User", ANSWERS, /\bMistralAI-User\b/i],
  ["YouBot", ANSWERS, /\bYouBot\b/i],
  ["iAsk", ANSWERS, /\biaskspider\b/i],
  ["Kagibot", SEARCH, /\bKagibot\b/i],
  // Training crawlers
  ["CCBot", TRAINING, /\bCCBot\b/i],
  ["Bytespider", TRAINING, /\bBytespider\b/i],
  ["Amazonbot", TRAINING, /\bAmazonbot\b/i],
  ["cohere-ai", TRAINING, /\bcohere-ai\b/i],
  ["Diffbot", TRAINING, /\bDiffbot\b/i],
  ["omgili", TRAINING, /\bomgili(?:bot)?\b/i],
  ["Timpibot", TRAINING, /\bTimpibot\b/i],
  ["ImagesiftBot", TRAINING, /\bImagesiftBot\b/i],
  ["PanguBot", TRAINING, /\bPanguBot\b/i],
  ["Applebot-Extended", TRAINING, /\bApplebot-Extended\b/i],
  // Search indexers
  ["Applebot", SEARCH, /\bApplebot\b/i],
  ["DuckDuckBot", SEARCH, /\bDuckDuckBot\b/i],
  ["YandexBot", SEARCH, /\bYandex(?:Bot|Images|Mobile)?\b/i],
  ["Baiduspider", SEARCH, /\bBaiduspider\b/i],
  ["Yahoo Slurp", SEARCH, /\bSlurp\b/i],
  ["Sogou", SEARCH, /\bSogou\b/i],
  ["Qwantbot", SEARCH, /\bQwant(?:ify|bot)\b/i],
  ["SeznamBot", SEARCH, /\bSeznamBot\b/i],
  ["PetalBot", SEARCH, /\bPetalBot\b/i],
  ["Mojeek", SEARCH, /\bMojeekBot\b/i],
  ["Neevabot", SEARCH, /\bNeevabot\b/i],
  // Social: link previews
  ["Slackbot", SOCIAL, /\bSlackbot\b/i],
  ["Discordbot", SOCIAL, /\bDiscordbot\b/i],
  ["Twitterbot", SOCIAL, /\bTwitterbot\b/i],
  ["LinkedInBot", SOCIAL, /\bLinkedInBot\b/i],
  ["WhatsApp", SOCIAL, /\bWhatsApp\b/i],
  ["TelegramBot", SOCIAL, /\bTelegramBot\b/i],
  ["Pinterestbot", SOCIAL, /\bPinterest(?:bot)?\b/i],
  ["redditbot", SOCIAL, /\bredditbot\b/i],
  ["Mastodon", SOCIAL, /\bMastodon\//i],
  ["Bluesky", SOCIAL, /\bBluesky Cardyb\b/i],
  ["Embedly", SOCIAL, /\bEmbedly\b/i],
  ["Iframely", SOCIAL, /\bIframely\b/i],
  ["Snapchat", SOCIAL, /\bSnapchat\b/i],
  // SEO crawlers
  ["AhrefsBot", SEO, /\bAhrefs(?:Bot|SiteAudit)\b/i],
  ["SemrushBot", SEO, /\bSemrushBot\b/i],
  ["DotBot", SEO, /\bDotBot\b/i],
  ["MJ12bot", SEO, /\bMJ12bot\b/i],
  ["Screaming Frog", SEO, /\bScreaming Frog\b/i],
  ["BLEXBot", SEO, /\bBLEXBot\b/i],
  ["DataForSeoBot", SEO, /\bDataForSeoBot\b/i],
  ["serpstatbot", SEO, /\bserpstatbot\b/i],
  ["rogerbot", SEO, /\brogerbot\b/i],
  ["SiteAuditBot", SEO, /\bSiteAuditBot\b/i],
  ["Barkrowler", SEO, /\bBarkrowler\b/i],
  // Monitors and tools; named so the list is readable, filed under other
  ["UptimeRobot", OTHER, /\bUptimeRobot\b/i],
  ["Pingdom", OTHER, /\bPingdom\b/i],
  ["GTmetrix", OTHER, /\bGTmetrix\b/i],
  ["Lighthouse", OTHER, /\bChrome-Lighthouse\b/i],
  ["HeadlessChrome", OTHER, /\bHeadlessChrome\b/i],
  ["curl", OTHER, /^curl\//i],
  ["wget", OTHER, /^Wget\//i],
  ["python-requests", OTHER, /^python-requests\//i],
  ["Python-urllib", OTHER, /^Python-urllib\//i],
  ["Go-http-client", OTHER, /^Go-http-client\//i],
  ["axios", OTHER, /^axios\//i],
  ["node-fetch", OTHER, /^node-fetch\//i],
  ["okhttp", OTHER, /^okhttp\//i],
  ["Scrapy", OTHER, /\bScrapy\//i],
];

/**
 * The crawler a user agent claims to be, or null when it is not a bot at all.
 * A user agent isbot flags but the list does not name is filed under other,
 * with the token that gave it away as its name, so a new crawler shows up on
 * the screen by name before it is added here.
 */
export function classifyCrawler(ua: string | null | undefined): Crawler | null {
  const s = (ua ?? "").trim();
  if (!s) return null;
  for (const [crawler, family, match] of KNOWN) {
    if (match.test(s)) return { crawler, family };
  }
  if (!isbot(s)) return null;
  return { crawler: guessName(s), family: OTHER };
}

const NAME_MAX = 40;

function guessName(ua: string): string {
  const m = ua.match(
    /([a-z][a-z0-9_.-]*(?:bot|crawler|spider|fetcher|scraper|agent)[a-z0-9_.-]*)/i
  );
  if (!m) return "Unknown bot";
  return m[1].replace(/[._-]+$/, "").slice(0, NAME_MAX);
}

const PATH_MAX = 512;

/**
 * The path as stored: query and fragment dropped, orientation requests
 * folded to their names, anything else capped.
 */
export function crawlerPath(raw: string | null | undefined): string {
  let p = (raw ?? "").split(/[?#]/, 1)[0].trim();
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "") || "/";
  const lower = p.toLowerCase();
  if (lower === "/robots.txt") return "robots.txt";
  if (lower === "/llms.txt" || lower === "/llms-full.txt") return "llms.txt";
  if (/sitemap[^/]*\.xml(?:\.gz)?$/.test(lower) || /^\/sitemaps?\//.test(lower))
    return "sitemap";
  return p.length > PATH_MAX ? p.slice(0, PATH_MAX) : p;
}
