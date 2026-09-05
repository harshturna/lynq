import { describe, expect, it } from "vitest";
import { parseUserAgent } from "./enrich";
import { CHROME } from "./fixtures";

describe("parseUserAgent", () => {
  it("parses a desktop browser", () => {
    expect(parseUserAgent(CHROME)).toMatchObject({
      browser: "Chrome",
      browser_major: 128,
      os: "Mac OS",
      device: "desktop",
    });
  });
  it("classifies phones and tablets", () => {
    const iphone =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
    const ipad =
      "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
    expect(parseUserAgent(iphone)).toMatchObject({
      browser: "Mobile Safari",
      os: "iOS",
      device: "mobile",
    });
    expect(parseUserAgent(ipad).device).toBe("tablet");
  });
  it("is empty for no user agent", () => {
    expect(parseUserAgent(null).device).toBe("");
  });
});
