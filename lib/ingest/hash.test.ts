import { describe, expect, it } from "vitest";
import { digestToInt64, idFromText, userHash, utcDay, visitorId } from "./hash";

// Fixed vectors: the backfill script reimplements nothing, it imports this
// module, but the vectors pin byte order and signedness for anyone who does.
describe("identity hashes", () => {
  const zeroSalt = Buffer.alloc(32);
  it("visitorId matches the committed vector", () => {
    expect(visitorId(zeroSalt, 31, "203.0.113.9", "Mozilla/5.0 test")).toBe(
      BigInt("6865445802285769511")
    );
  });
  it("userHash matches the committed vector", () => {
    expect(userHash("test-secret", 31, "user_123")).toBe(
      BigInt("-4465935365565259232")
    );
  });
  it("changes with every input", () => {
    const base = visitorId(zeroSalt, 31, "203.0.113.9", "ua");
    expect(visitorId(Buffer.alloc(32, 1), 31, "203.0.113.9", "ua")).not.toBe(
      base
    );
    expect(visitorId(zeroSalt, 32, "203.0.113.9", "ua")).not.toBe(base);
    expect(visitorId(zeroSalt, 31, "203.0.113.8", "ua")).not.toBe(base);
    expect(visitorId(zeroSalt, 31, "203.0.113.9", "ub")).not.toBe(base);
  });
  it("is signed 64-bit, so it fits a Postgres bigint", () => {
    const max = BigInt(2) ** BigInt(63) - BigInt(1);
    const min = -(BigInt(2) ** BigInt(63));
    for (const v of [
      visitorId(zeroSalt, 1, "1.1.1.1", "a"),
      userHash("s", 1, "u"),
      idFromText("session", "abc"),
    ]) {
      expect(v <= max && v >= min).toBe(true);
    }
    expect(digestToInt64(Buffer.alloc(8, 0xff))).toBe(BigInt("-1"));
  });
  it("utcDay uses the UTC calendar", () => {
    expect(utcDay(new Date("2026-09-05T23:59:59Z"))).toBe("2026-09-05");
    expect(utcDay(new Date("2026-09-06T00:00:00Z"))).toBe("2026-09-06");
  });
});
