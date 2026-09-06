import type { Utm } from "./url";

/**
 * Referrer hostname to a display source and a channel (design §7.5). A
 * hand-written list of the sources that matter; unmatched hostnames become
 * Referral with the hostname as the source. Match is on the hostname or any
 * parent domain, so www.google.co.uk and google.com both read as Google, and
 * the full hostname is tried first so gemini.google.com is AI, not Google.
 */
export type Channel =
  | "Direct"
  | "Organic Search"
  | "AI"
  | "Social"
  | "Referral"
  | "Email"
  | "Paid"
  | "Unknown";

type Entry = { source: string; channel: Channel };

const SEARCH: Channel = "Organic Search";
/** Answer engines, separated from search because a visit from one is a different intent. */
const AI: Channel = "AI";
const SOCIAL: Channel = "Social";
const EMAIL: Channel = "Email";
const REF: Channel = "Referral";

const KNOWN: Record<string, Entry> = {
  "google.com": { source: "Google", channel: SEARCH },
  "google.co.uk": { source: "Google", channel: SEARCH },
  "google.ca": { source: "Google", channel: SEARCH },
  "google.de": { source: "Google", channel: SEARCH },
  "google.fr": { source: "Google", channel: SEARCH },
  "google.co.in": { source: "Google", channel: SEARCH },
  "google.com.au": { source: "Google", channel: SEARCH },
  "google.co.jp": { source: "Google", channel: SEARCH },
  "google.com.br": { source: "Google", channel: SEARCH },
  "bing.com": { source: "Bing", channel: SEARCH },
  "duckduckgo.com": { source: "DuckDuckGo", channel: SEARCH },
  "yahoo.com": { source: "Yahoo", channel: SEARCH },
  "yandex.ru": { source: "Yandex", channel: SEARCH },
  "yandex.com": { source: "Yandex", channel: SEARCH },
  "baidu.com": { source: "Baidu", channel: SEARCH },
  "ecosia.org": { source: "Ecosia", channel: SEARCH },
  "search.brave.com": { source: "Brave Search", channel: SEARCH },
  "kagi.com": { source: "Kagi", channel: SEARCH },
  "startpage.com": { source: "Startpage", channel: SEARCH },
  "qwant.com": { source: "Qwant", channel: SEARCH },
  "chatgpt.com": { source: "ChatGPT", channel: AI },
  "chat.openai.com": { source: "ChatGPT", channel: AI },
  "claude.ai": { source: "Claude", channel: AI },
  "perplexity.ai": { source: "Perplexity", channel: AI },
  // more specific than google.com, and lookupReferrer tries the full hostname first
  "gemini.google.com": { source: "Gemini", channel: AI },
  "copilot.microsoft.com": { source: "Copilot", channel: AI },
  "grok.com": { source: "Grok", channel: AI },
  "chat.deepseek.com": { source: "DeepSeek", channel: AI },
  "poe.com": { source: "Poe", channel: AI },
  "you.com": { source: "You.com", channel: AI },
  "twitter.com": { source: "X", channel: SOCIAL },
  "t.co": { source: "X", channel: SOCIAL },
  "x.com": { source: "X", channel: SOCIAL },
  "facebook.com": { source: "Facebook", channel: SOCIAL },
  "instagram.com": { source: "Instagram", channel: SOCIAL },
  "linkedin.com": { source: "LinkedIn", channel: SOCIAL },
  "lnkd.in": { source: "LinkedIn", channel: SOCIAL },
  "reddit.com": { source: "Reddit", channel: SOCIAL },
  "youtube.com": { source: "YouTube", channel: SOCIAL },
  "youtu.be": { source: "YouTube", channel: SOCIAL },
  "tiktok.com": { source: "TikTok", channel: SOCIAL },
  "pinterest.com": { source: "Pinterest", channel: SOCIAL },
  "threads.net": { source: "Threads", channel: SOCIAL },
  "bsky.app": { source: "Bluesky", channel: SOCIAL },
  "mastodon.social": { source: "Mastodon", channel: SOCIAL },
  "news.ycombinator.com": { source: "Hacker News", channel: SOCIAL },
  "producthunt.com": { source: "Product Hunt", channel: SOCIAL },
  "lobste.rs": { source: "Lobsters", channel: SOCIAL },
  "dev.to": { source: "DEV", channel: SOCIAL },
  "medium.com": { source: "Medium", channel: SOCIAL },
  "substack.com": { source: "Substack", channel: EMAIL },
  "github.com": { source: "GitHub", channel: REF },
  "gitlab.com": { source: "GitLab", channel: REF },
  "stackoverflow.com": { source: "Stack Overflow", channel: REF },
  "wikipedia.org": { source: "Wikipedia", channel: REF },
  "mail.google.com": { source: "Gmail", channel: EMAIL },
  "outlook.live.com": { source: "Outlook", channel: EMAIL },
  "outlook.office.com": { source: "Outlook", channel: EMAIL },
  "mail.yahoo.com": { source: "Yahoo Mail", channel: EMAIL },
  "slack.com": { source: "Slack", channel: REF },
  "discord.com": { source: "Discord", channel: REF },
  "t.me": { source: "Telegram", channel: SOCIAL },
  "telegram.org": { source: "Telegram", channel: SOCIAL },
  "web.whatsapp.com": { source: "WhatsApp", channel: SOCIAL },
  "wa.me": { source: "WhatsApp", channel: SOCIAL },
};

export function lookupReferrer(hostname: string): Entry | null {
  const parts = hostname.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join(".");
    const hit = KNOWN[candidate];
    if (hit) return hit;
  }
  return null;
}

const PAID_MEDIUMS = new Set([
  "cpc",
  "ppc",
  "paid",
  "paidsearch",
  "paid-social",
  "paidsocial",
  "display",
  "cpm",
  "retargeting",
]);
const EMAIL_MEDIUMS = new Set(["email", "e-mail", "newsletter"]);
const SOCIAL_MEDIUMS = new Set(["social", "social-media", "sm"]);

/**
 * UTM overrides the referrer: a tagged link says what it is. Otherwise the
 * referrer table decides. Nothing at all is Direct.
 */
export function classify(
  referrerHost: string,
  utm: Utm
): { source: string; channel: Channel } {
  const medium = utm.utm_medium.toLowerCase();
  const source = utm.utm_source;
  if (medium || source) {
    if (PAID_MEDIUMS.has(medium))
      return { source: source || "Paid", channel: "Paid" };
    if (EMAIL_MEDIUMS.has(medium))
      return { source: source || "Email", channel: "Email" };
    if (SOCIAL_MEDIUMS.has(medium))
      return { source: source || "Social", channel: "Social" };
    if (source) {
      const known = lookupReferrer(source.toLowerCase());
      return {
        source: known?.source ?? source,
        channel: known?.channel ?? "Referral",
      };
    }
  }
  if (!referrerHost) return { source: "", channel: "Direct" };
  const known = lookupReferrer(referrerHost);
  if (known) return known;
  return { source: referrerHost, channel: "Referral" };
}
