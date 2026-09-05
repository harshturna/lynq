import { describe, expect, it } from "vitest";
import { presetDates, rangeLabel, stepRange, todayIn } from "./ranges";

describe("ranges", () => {
  const today = "2026-09-05";

  it("computes today in the site timezone", () => {
    const now = new Date("2026-09-05T02:30:00Z");
    expect(todayIn("UTC", now)).toBe("2026-09-05");
    expect(todayIn("America/Toronto", now)).toBe("2026-09-04");
    expect(todayIn("Asia/Tokyo", now)).toBe("2026-09-05");
  });

  it("expands presets to inclusive dates", () => {
    expect(presetDates("last_7d", today)).toEqual({
      from: "2026-08-30",
      to: today,
    });
    expect(presetDates("last_30d", today)).toEqual({
      from: "2026-08-07",
      to: today,
    });
    expect(presetDates("yesterday", today)).toEqual({
      from: "2026-09-04",
      to: "2026-09-04",
    });
    expect(presetDates("this_week", today)).toEqual({
      from: "2026-08-31",
      to: today,
    }); // Monday
    expect(presetDates("this_month", today)).toEqual({
      from: "2026-09-01",
      to: today,
    });
    expect(
      presetDates({ from: "2026-01-01", to: "2026-01-31" }, today)
    ).toEqual({ from: "2026-01-01", to: "2026-01-31" });
  });

  it("steps a range by its own length and never past today", () => {
    expect(stepRange("last_7d", -1, today)).toEqual({
      from: "2026-08-23",
      to: "2026-08-29",
    });
    expect(
      stepRange({ from: "2026-08-01", to: "2026-08-31" }, 1, today)
    ).toEqual({ from: "2026-09-01", to: today });
    expect(stepRange("last_30d", 1, today)).toBe("last_30d"); // already ends today
  });

  it("labels presets and custom ranges", () => {
    expect(rangeLabel("last_30d")).toBe("Last 30 days");
    expect(rangeLabel({ from: "2026-08-06", to: "2026-09-04" })).toBe(
      "Aug 6 – Sep 4, 2026"
    );
    expect(rangeLabel({ from: "2025-09-06", to: "2026-09-05" })).toBe(
      "Sep 6, 2025 – Sep 5, 2026"
    );
  });
});
