import { describe, expect, it } from "vitest";
import { siteStatus } from "./site-status";

describe("siteStatus", () => {
  const now = new Date("2026-09-05T12:00:00Z");
  it("names the three states", () => {
    expect(siteStatus(null, now)).toEqual({
      tone: "none",
      text: "No data yet",
    });
    expect(siteStatus(new Date("2026-09-05T11:58:00Z"), now)).toEqual({
      tone: "good",
      text: "Receiving data",
    });
    expect(siteStatus(new Date("2026-08-29T12:00:00Z"), now)).toEqual({
      tone: "warn",
      text: "Nothing for 7 days",
    });
    expect(siteStatus(new Date("2026-08-30T12:00:01Z"), now).tone).toBe("good");
  });
});
