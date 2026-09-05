import { describe, expect, it } from "vitest";
import { boundTimestamp } from "./time-bounds";

describe("boundTimestamp", () => {
  const now = new Date("2026-09-05T12:00:00Z");
  it("keeps timestamps inside the window exactly as sent", () => {
    const t = now.getTime() - 3000;
    expect(boundTimestamp(t, now)?.getTime()).toBe(t);
    expect(boundTimestamp(now.getTime() + 4 * 60_000, now)).not.toBeNull();
    expect(boundTimestamp(now.getTime() - 23 * 3_600_000, now)).not.toBeNull();
  });
  it("drops timestamps outside it", () => {
    expect(boundTimestamp(now.getTime() + 6 * 60_000, now)).toBeNull();
    expect(boundTimestamp(now.getTime() - 25 * 3_600_000, now)).toBeNull();
  });
});
