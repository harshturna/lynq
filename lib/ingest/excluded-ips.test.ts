import { describe, expect, it } from "vitest";
import { isExcludedIp } from "./excluded-ips";

describe("isExcludedIp", () => {
  it("matches v4 ranges, single addresses and v6", () => {
    expect(isExcludedIp("10.0.0.7", ["10.0.0.0/8"])).toBe(true);
    expect(isExcludedIp("11.0.0.7", ["10.0.0.0/8"])).toBe(false);
    expect(isExcludedIp("203.0.113.9", ["203.0.113.9"])).toBe(true);
    expect(isExcludedIp("2001:db8::1", ["2001:db8::/32"])).toBe(true);
  });
  it("ignores malformed entries and empty lists", () => {
    expect(isExcludedIp("10.0.0.7", ["garbage", "10.0.0.0/8"])).toBe(true);
    expect(isExcludedIp("10.0.0.7", [])).toBe(false);
    expect(isExcludedIp("not-an-ip", ["10.0.0.0/8"])).toBe(false);
  });
});
