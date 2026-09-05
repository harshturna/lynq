import { describe, expect, it } from "vitest";
import { cleanText, parsePageUrl, parseReferrer, parseUtm } from "./url";

describe("cleanText", () => {
  it("strips control characters and caps length", () => {
    expect(cleanText("abcde", 10)).toBe("abcde");
    expect(cleanText("x".repeat(20), 5)).toBe("xxxxx");
    expect(cleanText(undefined, 5)).toBe("");
  });
});

describe("parsePageUrl", () => {
  it("keeps only allow-listed params and drops the fragment", () => {
    const p = parsePageUrl(
      "https://WWW.Example.com/Docs/?session=SECRET&utm_source=x&ref=hn#top"
    );
    expect(p).toEqual({
      hostname: "example.com",
      path: "/Docs/",
      query: "utm_source=x&ref=hn",
    });
  });
  it("returns null for garbage", () => {
    expect(parsePageUrl("not a url")).toBeNull();
  });
});

describe("parseUtm", () => {
  it("reads the five utm params from the session entry url", () => {
    expect(
      parseUtm("https://a.b/?utm_source=x&utm_medium=cpc&utm_campaign=c")
    ).toMatchObject({
      utm_source: "x",
      utm_medium: "cpc",
      utm_campaign: "c",
      utm_term: "",
      utm_content: "",
    });
    expect(parseUtm(undefined).utm_source).toBe("");
  });
});

describe("parseReferrer", () => {
  it("treats the site's own hostnames as internal", () => {
    expect(
      parseReferrer("https://app.example.com/x", [
        "example.com",
        "app.example.com",
      ])
    ).toEqual({
      referrer: "",
      referrer_url: "",
    });
  });
  it("keeps host and path, never the query", () => {
    expect(
      parseReferrer("https://www.google.com/search?q=secret", ["example.com"])
    ).toEqual({
      referrer: "google.com",
      referrer_url: "https://www.google.com/search",
    });
  });
});
