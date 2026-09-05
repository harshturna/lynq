import { describe, expect, it, vi } from "vitest";
import { settle } from "./settle";

describe("settle", () => {
  it("never rejects and names the failed section", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await settle("overview.summary", Promise.resolve(1))).toEqual({
      ok: true,
      data: 1,
    });
    expect(
      await settle("overview.pages", Promise.reject(new Error("boom")))
    ).toEqual({ ok: false, name: "overview.pages" });
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
