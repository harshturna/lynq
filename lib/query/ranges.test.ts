import { describe, expect, it } from "vitest";
import {
  buckets,
  compareRange,
  resolveRange,
  zonedMidnight,
  zonedParts,
} from "./ranges";

const TZ = "America/Winnipeg"; // UTC-5 in September (CDT)
const now = new Date("2026-09-05T20:30:00Z"); // 15:30 local on Saturday 5 Sept

describe("timezone helpers", () => {
  it("reads calendar parts in the site timezone", () => {
    expect(zonedParts(now, TZ)).toMatchObject({
      y: 2026,
      m: 9,
      d: 5,
      h: 15,
      weekday: 6,
    });
    expect(zonedParts(new Date("2026-09-06T03:00:00Z"), TZ)).toMatchObject({
      d: 5,
      h: 22,
    });
  });
  it("finds local midnight as a UTC instant", () => {
    expect(zonedMidnight(2026, 9, 5, TZ).toISOString()).toBe(
      "2026-09-05T05:00:00.000Z"
    );
    expect(zonedMidnight(2026, 1, 15, TZ).toISOString()).toBe(
      "2026-01-15T06:00:00.000Z"
    ); // CST
    expect(zonedMidnight(2026, 9, 5, "UTC").toISOString()).toBe(
      "2026-09-05T00:00:00.000Z"
    );
  });
});

describe("resolveRange", () => {
  it("today is the local day, half-open", () => {
    const r = resolveRange("today", TZ, now);
    expect(r.from.toISOString()).toBe("2026-09-05T05:00:00.000Z");
    expect(r.toExclusive.toISOString()).toBe("2026-09-06T05:00:00.000Z");
    expect(r.granularity).toBe("hour");
  });
  it("last 7 days starts at local midnight six days ago and ends now", () => {
    const r = resolveRange("last_7d", TZ, now);
    expect(r.from.toISOString()).toBe("2026-08-30T05:00:00.000Z");
    expect(r.toExclusive).toBe(now);
    expect(r.granularity).toBe("day");
  });
  it("this week starts on Monday", () => {
    const r = resolveRange("this_week", TZ, now);
    expect(zonedParts(r.from, TZ)).toMatchObject({ m: 8, d: 31, weekday: 1 });
    expect(zonedParts(r.toExclusive, TZ)).toMatchObject({
      m: 9,
      d: 7,
      weekday: 1,
    });
  });
  it("custom dates are inclusive on both ends as dates, half-open as instants", () => {
    const r = resolveRange({ from: "2026-09-01", to: "2026-09-03" }, TZ, now);
    expect(r.from.toISOString()).toBe("2026-09-01T05:00:00.000Z");
    expect(r.toExclusive.toISOString()).toBe("2026-09-04T05:00:00.000Z");
    expect(() =>
      resolveRange({ from: "2026-09-03", to: "2026-09-01" }, TZ, now)
    ).toThrow();
  });
  it("last 12 months starts on the first of the month eleven months back", () => {
    const r = resolveRange("last_12mo", TZ, now);
    expect(zonedParts(r.from, TZ)).toMatchObject({ y: 2025, m: 10, d: 1 });
    expect(r.granularity).toBe("month");
  });
});

describe("compareRange", () => {
  it("previous period is the same length, ending where the current one starts", () => {
    const r = resolveRange({ from: "2026-09-01", to: "2026-09-03" }, TZ, now);
    const c = compareRange(r, "previous_period", TZ);
    expect(c.toExclusive).toEqual(r.from);
    expect(r.from.getTime() - c.from.getTime()).toBe(3 * 86_400_000);
  });
  it("previous year keeps the calendar dates", () => {
    const r = resolveRange({ from: "2026-09-01", to: "2026-09-03" }, TZ, now);
    const c = compareRange(r, "previous_year", TZ);
    expect(zonedParts(c.from, TZ)).toMatchObject({ y: 2025, m: 9, d: 1 });
    expect(zonedParts(c.toExclusive, TZ)).toMatchObject({
      y: 2025,
      m: 9,
      d: 4,
    });
  });
});

describe("buckets", () => {
  it("produces one local day per bucket for a day series", () => {
    const r = resolveRange({ from: "2026-09-01", to: "2026-09-03" }, TZ, now);
    const b = buckets(r.from, r.toExclusive, "day", TZ);
    expect(b.map((d) => d.toISOString())).toEqual([
      "2026-09-01T05:00:00.000Z",
      "2026-09-02T05:00:00.000Z",
      "2026-09-03T05:00:00.000Z",
    ]);
  });
  it("aligns week buckets to Monday and month buckets to the first", () => {
    const r = resolveRange({ from: "2026-09-02", to: "2026-09-16" }, TZ, now);
    expect(
      buckets(r.from, r.toExclusive, "week", TZ).map((d) => zonedParts(d, TZ).d)
    ).toEqual([31, 7, 14]);
    expect(
      buckets(r.from, r.toExclusive, "month", TZ).map(
        (d) => zonedParts(d, TZ).m
      )
    ).toEqual([9]);
  });
  it("hour buckets cover a 24 h window", () => {
    const r = resolveRange("last_24h", TZ, now);
    expect(buckets(r.from, r.toExclusive, "hour", TZ)).toHaveLength(25);
  });
});
