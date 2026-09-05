import { describe, expect, it } from "vitest";
import { globToLike, globToRegExp, matchesAnyGlob } from "./glob";

describe("glob", () => {
  it("matches * across segments and ? for one character", () => {
    expect(matchesAnyGlob("/admin/users/1", ["/admin/*"])).toBe(true);
    expect(matchesAnyGlob("/admin", ["/admin/*"])).toBe(false);
    expect(matchesAnyGlob("/p/a", ["/p/?"])).toBe(true);
    expect(matchesAnyGlob("/p/ab", ["/p/?"])).toBe(false);
  });
  it("escapes regex metacharacters", () => {
    expect(globToRegExp("/a.b(c)").test("/a.b(c)")).toBe(true);
    expect(globToRegExp("/a.b").test("/aXb")).toBe(false);
  });
  it("translates to LIKE with escapes", () => {
    expect(globToLike("/blog/*")).toBe("/blog/%");
    expect(globToLike("/100%_off?")).toBe("/100\\%\\_off_");
  });
});
