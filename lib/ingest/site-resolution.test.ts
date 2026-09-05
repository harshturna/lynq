import { describe, expect, it, vi } from "vitest";
import { SITE } from "./fixtures";
import { createSiteResolver } from "./site-resolution";

describe("site resolver cache", () => {
  it("caches hits and misses for the ttl", async () => {
    let t = 0;
    const load = vi.fn(async (h: string) =>
      h === "aivia.byharsh.com" ? SITE : null
    );
    const resolve = createSiteResolver(load, 60_000, () => t);
    await resolve("aivia.byharsh.com");
    await resolve("aivia.byharsh.com");
    await resolve("nope.example");
    await resolve("nope.example");
    expect(load).toHaveBeenCalledTimes(2);
    t = 61_000;
    await resolve("nope.example");
    expect(load).toHaveBeenCalledTimes(3);
  });
});
