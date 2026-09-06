import { describe, expect, it } from "vitest";
import { classifyCrawler, crawlerPath, isOrientation } from "./crawlers";

// Real user agent strings, as each crawler documents them.
const CASES: [ua: string, crawler: string, family: string][] = [
  [
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot",
    "ChatGPT-User",
    "answers",
  ],
  [
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot",
    "OAI-SearchBot",
    "answers",
  ],
  [
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
    "GPTBot",
    "training",
  ],
  [
    "Mozilla/5.0 (compatible; Claude-User/1.0; +Claude-User@anthropic.com)",
    "Claude-User",
    "answers",
  ],
  [
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)",
    "ClaudeBot",
    "training",
  ],
  [
    "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)",
    "PerplexityBot",
    "answers",
  ],
  [
    "Mozilla/5.0 (compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user)",
    "Perplexity-User",
    "answers",
  ],
  [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Googlebot",
    "search",
  ],
  [
    "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Googlebot",
    "search",
  ],
  [
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36",
    "bingbot",
    "search",
  ],
  [
    "DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)",
    "DuckDuckBot",
    "search",
  ],
  [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1; +http://www.apple.com/go/applebot)",
    "Applebot",
    "search",
  ],
  ["CCBot/2.0 (https://commoncrawl.org/faq/)", "CCBot", "training"],
  [
    "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)",
    "Bytespider",
    "training",
  ],
  [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/600.2.5 (KHTML, like Gecko) Version/8.0.2 Safari/600.2.5 (Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)",
    "Amazonbot",
    "training",
  ],
  [
    "meta-externalagent/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
    "Meta-ExternalAgent",
    "training",
  ],
  [
    "meta-externalfetcher/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)",
    "meta-externalfetcher",
    "answers",
  ],
  [
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "facebookexternalhit",
    "social",
  ],
  [
    "Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)",
    "Slackbot",
    "social",
  ],
  [
    "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)",
    "Discordbot",
    "social",
  ],
  ["Twitterbot/1.0", "Twitterbot", "social"],
  [
    "LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)",
    "LinkedInBot",
    "social",
  ],
  ["WhatsApp/2.23.20.0", "WhatsApp", "social"],
  [
    "http.rb/5.1.1 (Mastodon/4.2.0; +https://mastodon.social/)",
    "Mastodon",
    "social",
  ],
  [
    "Mozilla/5.0 (compatible; Bluesky Cardyb/1.1; +mailto:support@bsky.app)",
    "Bluesky",
    "social",
  ],
  [
    "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
    "AhrefsBot",
    "seo",
  ],
  [
    "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)",
    "SemrushBot",
    "seo",
  ],
  [
    "Mozilla/5.0 (compatible; DotBot/1.2; +https://opensiteexplorer.org/dotbot; help@moz.com)",
    "DotBot",
    "seo",
  ],
  [
    "Mozilla/5.0 (compatible; MJ12bot/v1.4.8; http://mj12bot.com/)",
    "MJ12bot",
    "seo",
  ],
  ["curl/8.4.0", "curl", "other"],
  ["python-requests/2.31.0", "python-requests", "other"],
  ["Go-http-client/1.1", "Go-http-client", "other"],
  [
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Chrome-Lighthouse",
    "Lighthouse",
    "other",
  ],
];

describe("crawler classification", () => {
  it.each(CASES)("%s", (ua, crawler, family) => {
    expect(classifyCrawler(ua)).toEqual({ crawler, family });
  });

  it("keeps the OpenAI and Anthropic tokens apart", () => {
    // the answers token contains 'GPT'; it must not read as the training one
    expect(classifyCrawler("ChatGPT-User/1.0")?.crawler).toBe("ChatGPT-User");
    expect(classifyCrawler("GPTBot/1.0")?.crawler).toBe("GPTBot");
    expect(classifyCrawler("Claude-User/1.0")?.family).toBe("answers");
    expect(classifyCrawler("ClaudeBot/1.0")?.family).toBe("training");
  });

  it("is null for a person", () => {
    for (const ua of [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
      "",
      undefined,
    ]) {
      expect(classifyCrawler(ua), ua ?? "undefined").toBeNull();
    }
  });

  it("names a bot the list does not know from the token that gave it away", () => {
    expect(
      classifyCrawler(
        "Mozilla/5.0 (compatible; NewShinyBot/3.1; +https://example.com/bot)"
      )
    ).toEqual({
      crawler: "NewShinyBot",
      family: "other",
    });
    expect(classifyCrawler("SomethingCrawler/0.9")).toEqual({
      crawler: "SomethingCrawler",
      family: "other",
    });
  });
});

describe("crawler paths", () => {
  it("folds the orientation requests to their names", () => {
    expect(crawlerPath("/robots.txt")).toBe("robots.txt");
    expect(crawlerPath("/ROBOTS.TXT")).toBe("robots.txt");
    expect(crawlerPath("/llms.txt")).toBe("llms.txt");
    expect(crawlerPath("/llms-full.txt")).toBe("llms.txt");
    expect(crawlerPath("/sitemap.xml")).toBe("sitemap");
    expect(crawlerPath("/sitemap_index.xml")).toBe("sitemap");
    expect(crawlerPath("/sitemap-posts-1.xml.gz")).toBe("sitemap");
    expect(crawlerPath("/sitemaps/pages.xml")).toBe("sitemap");
    expect(crawlerPath("/docs/sitemap-guide")).toBe("/docs/sitemap-guide");
    for (const p of ["robots.txt", "llms.txt", "sitemap"])
      expect(isOrientation(p)).toBe(true);
    expect(isOrientation("/robots.txt")).toBe(false);
  });

  it("drops the query and the trailing slash, and caps the length", () => {
    expect(crawlerPath("/docs/install?ref=x#top")).toBe("/docs/install");
    expect(crawlerPath("/docs/")).toBe("/docs");
    expect(crawlerPath("/")).toBe("/");
    expect(crawlerPath("")).toBe("/");
    expect(crawlerPath("docs")).toBe("/docs");
    expect(crawlerPath(`/${"a".repeat(600)}`)).toHaveLength(512);
  });
});
