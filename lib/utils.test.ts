import { describe, expect, it } from "vitest";
import { calculateWebVitalScore, getPreviousPeriodBounds } from "./utils";

describe("calculateWebVitalScore", () => {
  it("formats page load in seconds from a millisecond value (TICKET-004)", () => {
    expect(calculateWebVitalScore(1834, "load")).toMatchObject({
      score: "1.83s",
      range: "Good",
    });
    expect(calculateWebVitalScore(7000, "load")).toMatchObject({
      score: "7.00s",
      range: "Poor",
    });
  });
  it("reports missing data as N/A", () => {
    expect(calculateWebVitalScore(-1, "lcp").range).toBe("Not enough data");
  });
});

describe("getPreviousPeriodBounds", () => {
  it("returns a window of the same length ending where the current one starts", () => {
    const { from, to } = getPreviousPeriodBounds("Last 7 days");
    const length = new Date(to).getTime() - new Date(from).getTime();
    expect(Math.round(length / 86_400_000)).toBe(7);
  });
});
