import { describe, expect, it } from "vitest";
import { fmtAgo, fmtDuration, fmtInt, fmtRatio } from "./format";

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
  it("relative times", () => {
    const now = new Date("2026-09-05T12:00:00Z");
    expect(fmtAgo(new Date("2026-09-05T11:59:40Z"), now)).toBe("just now");
    expect(fmtAgo(new Date("2026-09-05T11:58:00Z"), now)).toBe("2 min ago");
    expect(fmtAgo(new Date("2026-09-05T09:00:00Z"), now)).toBe("3 hours ago");
    expect(fmtAgo(new Date("2026-08-30T12:00:00Z"), now)).toBe("6 days ago");
  });
});
