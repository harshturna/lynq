import { describe, expect, it } from "vitest";
import { calculateWebVitalScore } from "./utils";

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
