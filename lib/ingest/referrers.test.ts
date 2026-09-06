import { describe, expect, it } from "vitest";
import { classify, lookupReferrer } from "./referrers";

const utm = (o: Partial<Record<string, string>> = {}) => ({
  utm_source: "",
  utm_medium: "",
  utm_campaign: "",
  utm_term: "",
  utm_content: "",
  ...o,
});

describe("referrer classification", () => {
  it("matches parent domains", () => {
    expect(lookupReferrer("www.google.co.uk")).toEqual({
      source: "Google",
      channel: "Organic Search",
    });
    expect(lookupReferrer("news.ycombinator.com")?.source).toBe("Hacker News");
    expect(lookupReferrer("unknown.example")).toBeNull();
  });
  it("puts answer engines on their own channel", () => {
    for (const [host, source] of [
      ["chatgpt.com", "ChatGPT"],
      ["claude.ai", "Claude"],
      ["www.perplexity.ai", "Perplexity"],
      ["copilot.microsoft.com", "Copilot"],
      ["grok.com", "Grok"],
    ] as const) {
      expect(lookupReferrer(host), host).toEqual({ source, channel: "AI" });
    }
    // the full hostname is tried before its parents, so this is not Google
    expect(lookupReferrer("gemini.google.com")).toEqual({
      source: "Gemini",
      channel: "AI",
    });
    expect(lookupReferrer("www.google.com")?.channel).toBe("Organic Search");
    // and a tagged link naming one of them classifies the same way
    expect(classify("", utm({ utm_source: "chatgpt.com" }))).toEqual({
      source: "ChatGPT",
      channel: "AI",
    });
  });
  it("is Direct with nothing, Referral for unknown hosts", () => {
    expect(classify("", utm())).toEqual({ source: "", channel: "Direct" });
    expect(classify("blog.example", utm())).toEqual({
      source: "blog.example",
      channel: "Referral",
    });
  });
  it("lets utm override the referrer", () => {
    expect(
      classify("google.com", utm({ utm_medium: "cpc", utm_source: "google" }))
    ).toEqual({
      source: "google",
      channel: "Paid",
    });
    expect(
      classify("", utm({ utm_medium: "email", utm_source: "newsletter" }))
    ).toEqual({
      source: "newsletter",
      channel: "Email",
    });
    expect(classify("", utm({ utm_source: "twitter.com" }))).toEqual({
      source: "X",
      channel: "Social",
    });
  });
});
