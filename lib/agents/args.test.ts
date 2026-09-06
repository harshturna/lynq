import { describe, expect, it } from "vitest";
import {
  ArgError,
  checkDimension,
  contextOptions,
  DIMENSIONS,
  filtersSchema,
  METRICS,
  rangeSchema,
} from "./args";

describe("agent arguments", () => {
  it("publishes the dashboard's own dimensions and metrics", () => {
    expect(DIMENSIONS).toContain("path");
    expect(DIMENSIONS).toContain("entry_channel");
    expect(METRICS).toEqual(
      expect.arrayContaining(["visitors", "sessions", "bounce_rate", "revenue"])
    );
  });
  it("accepts a preset or a date pair, and nothing else", () => {
    expect(rangeSchema.safeParse("last_7d").success).toBe(true);
    expect(
      rangeSchema.safeParse({ from: "2026-08-01", to: "2026-08-31" }).success
    ).toBe(true);
    expect(rangeSchema.safeParse("last_week").success).toBe(false);
    expect(
      rangeSchema.safeParse({ from: "Aug 1", to: "2026-08-31" }).success
    ).toBe(false);
  });
  it("defaults the range, dedupes values, and names a bad dimension", () => {
    const o = contextOptions({
      filters: [{ dimension: "country", op: "is", values: ["CA", "CA", "US"] }],
    });
    expect(o).toEqual({
      range: "last_30d",
      filters: [{ dimension: "country", op: "is", values: ["CA", "US"] }],
      compare: undefined,
    });
    expect(() =>
      contextOptions({
        filters: [{ dimension: "colour", op: "is", values: ["x"] }],
      })
    ).toThrow(ArgError);
    expect(() =>
      contextOptions({
        filters: [{ dimension: "colour", op: "is", values: ["x"] }],
      })
    ).toThrow(/Unknown filter dimension "colour"/);
    expect(() =>
      contextOptions({ range: { from: "2026-09-02", to: "2026-09-01" } })
    ).toThrow(/after/);
    expect(checkDimension("prop:plan")).toBe("prop:plan");
    expect(() => checkDimension("plan")).toThrow(ArgError);
  });
  it("defaults the op to is and caps the list", () => {
    const r = filtersSchema.parse([{ dimension: "path", values: ["/"] }]);
    expect(r[0].op).toBe("is");
    expect(
      filtersSchema.safeParse(
        Array.from({ length: 11 }, () => ({ dimension: "path", values: ["/"] }))
      ).success
    ).toBe(false);
  });
});
