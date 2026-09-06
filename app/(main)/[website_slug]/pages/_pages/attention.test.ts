import { describe, expect, it } from "vitest";
import { attentionSummary } from "./attention";

const row = (value: string, pageviews: number, engagedMs = 0) => ({
  value,
  pageviews,
  engagedMs,
});

describe("attentionSummary", () => {
  it("splits the top pages and folds the rest into one segment", () => {
    const rows = [
      row("/", 500, 100_000),
      row("/pricing", 300, 140_000),
      row("/docs", 200, 220_000),
      row("/a", 50),
      row("/b", 40),
      row("/c", 30),
      row("/d", 20),
      row("/e", 10),
    ];
    const s = attentionSummary(rows, 1_200);
    expect(s?.segments.map((x) => x.key)).toEqual([
      "/",
      "/pricing",
      "/docs",
      "/a",
      "/b",
      "/c",
      "__rest",
    ]);
    expect(s?.segments.at(-1)).toMatchObject({
      label: "2 other pages",
      value: 80,
    });
    expect(s?.topCount).toBe(3);
    expect(s?.topShare).toBeCloseTo((1000 / 1200) * 100);
    expect(s?.longest).toEqual({ path: "/docs", ms: 220_000 });
    expect(s?.shortest).toEqual({ path: "/", ms: 100_000 });
  });
  it("ranks by pageviews whatever the input order and drops empty rows", () => {
    const s = attentionSummary([row("/b", 1), row("/a", 9), row("/z", 0)], 10);
    expect(s?.segments.map((x) => x.key)).toEqual(["/a", "/b"]);
    expect(s?.topCount).toBe(2);
  });
  it("needs two pages, and no shortest when every page dwells the same", () => {
    expect(attentionSummary([row("/", 10)], 10)).toBeNull();
    const s = attentionSummary([row("/", 6, 5000), row("/x", 4, 5000)], 10);
    expect(s?.longest).toEqual({ path: "/", ms: 5000 });
    expect(s?.shortest).toBeNull();
  });
  it("labels a remainder with no further pages as other pageviews", () => {
    const s = attentionSummary([row("/", 6), row("/x", 4)], 12);
    expect(s?.segments.at(-1)).toMatchObject({
      label: "other pageviews",
      value: 2,
    });
    expect(
      attentionSummary([row("/", 6), row("/x", 4)], 10)?.segments
    ).toHaveLength(2);
  });
});
