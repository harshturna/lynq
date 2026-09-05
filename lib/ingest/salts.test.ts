import { describe, expect, it, vi } from "vitest";
import { createSaltCache } from "./salt-cache";

describe("salt cache", () => {
  it("loads each day once and keys by day, not by 'today'", async () => {
    const load = vi.fn(async (day: string) => Buffer.from(day));
    const saltFor = createSaltCache(load);
    await saltFor("2026-09-05");
    await saltFor("2026-09-05");
    const next = await saltFor("2026-09-06"); // the instance lived across midnight
    expect(load).toHaveBeenCalledTimes(2);
    expect(next.toString()).toBe("2026-09-06");
    expect((await saltFor("2026-09-05")).toString()).toBe("2026-09-05");
  });
  it("evicts old days", async () => {
    const load = vi.fn(async (day: string) => Buffer.from(day));
    const saltFor = createSaltCache(load, 2);
    for (const d of ["2026-09-01", "2026-09-02", "2026-09-03"])
      await saltFor(d);
    await saltFor("2026-09-01");
    expect(load).toHaveBeenCalledTimes(4);
  });
  it("does not cache a failed load", async () => {
    let calls = 0;
    const saltFor = createSaltCache(async () => {
      calls += 1;
      if (calls === 1) throw new Error("db down");
      return Buffer.alloc(32);
    });
    await expect(saltFor("2026-09-05")).rejects.toThrow("db down");
    await expect(saltFor("2026-09-05")).resolves.toHaveLength(32);
  });
});
