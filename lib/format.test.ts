import { describe, expect, it } from "vitest";
import { fmtDuration, fmtInt, fmtRatio } from "./format";

describe("format", () => {
  it("durations", () => {
    expect(fmtDuration(0)).toBe("0s");
    expect(fmtDuration(48_000)).toBe("48s");
    expect(fmtDuration(108_000)).toBe("1m 48s");
    expect(fmtDuration(7_380_000)).toBe("2h 03m");
  });
  it("ratios never divide by zero", () => {
    expect(fmtRatio(1, 0)).toBe("—");
    expect(fmtRatio(1, 3)).toBe("33.3%");
    expect(fmtInt(12480.4)).toBe("12,480");
  });
});
