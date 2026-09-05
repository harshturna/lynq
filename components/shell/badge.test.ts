import { describe, expect, it } from "vitest";
import { deltaOf } from "./badge";

describe("deltaOf", () => {
  it("formats percentage changes and colours them by direction", () => {
    expect(deltaOf(110, 100)).toEqual({
      direction: "up",
      text: "10.0%",
      good: true,
    });
    expect(deltaOf(90, 100)).toEqual({
      direction: "down",
      text: "10.0%",
      good: false,
    });
    expect(deltaOf(100, 100)).toEqual({
      direction: "flat",
      text: "no change",
      good: null,
    });
  });

  it("flips the colour, not the arrow, when lower is better", () => {
    expect(deltaOf(42, 39, { lowerIsBetter: true })).toEqual({
      direction: "up",
      text: "7.7%",
      good: false,
    });
  });

  it("uses points for rates and handles a zero or missing baseline", () => {
    expect(deltaOf(3.4, 2.8, { points: true })).toEqual({
      direction: "up",
      text: "0.6 pts",
      good: true,
    });
    expect(deltaOf(5, 0)).toEqual({ direction: "up", text: "new", good: true });
    expect(deltaOf(0, 0)).toEqual({
      direction: "flat",
      text: "no change",
      good: null,
    });
    expect(deltaOf(5, null)).toBeNull();
  });
});
