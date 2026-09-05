import { describe, expect, it } from "vitest";
import { getClientIp } from "./client-ip";

const H = (o: Record<string, string>) => ({
  get: (k: string) => o[k.toLowerCase()] ?? null,
});

describe("getClientIp", () => {
  it("prefers the platform header and never reads x-forwarded-for", () => {
    expect(
      getClientIp(
        H({
          "x-vercel-forwarded-for": "203.0.113.9",
          "x-forwarded-for": "9.9.9.9, 203.0.113.9",
        })
      )
    ).toBe("203.0.113.9");
    expect(getClientIp(H({ "x-forwarded-for": "9.9.9.9" }))).toBeNull();
  });
  it("falls back to x-real-ip and takes the first entry of a list", () => {
    expect(getClientIp(H({ "x-real-ip": " 198.51.100.4 " }))).toBe(
      "198.51.100.4"
    );
    expect(
      getClientIp(H({ "x-vercel-forwarded-for": "203.0.113.9, 10.0.0.1" }))
    ).toBe("203.0.113.9");
  });
});
