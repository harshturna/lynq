import { describe, expect, it } from "vitest";
import { generateCrawlerDays } from "./crawlers";

describe("generateCrawlerDays", () => {
  const until = new Date("2026-09-06T12:00:00Z");
  const rows = generateCrawlerDays({ siteId: 1, days: 30, seed: 7, until });

  it("is deterministic and stays inside the range", () => {
    expect(
      generateCrawlerDays({ siteId: 1, days: 30, seed: 7, until })
    ).toEqual(rows);
    const days = new Set(rows.map((r) => r.day));
    expect(days.size).toBe(31);
    expect([...days].sort()[0]).toBe("2026-08-07");
    expect(rows.every((r) => r.last_seen < until)).toBe(true);
  });

  it("covers every family and folds one row per day, crawler and path", () => {
    const families = new Set(rows.map((r) => r.family));
    expect([...families].sort()).toEqual([
      "answers",
      "other",
      "search",
      "seo",
      "social",
      "training",
    ]);
    const keys = rows.map((r) => `${r.day}|${r.crawler}|${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(
      rows.some((r) => r.path === "llms.txt" && r.crawler === "ChatGPT-User")
    ).toBe(true);
    expect(
      rows.some((r) => r.path === "robots.txt" && r.crawler === "Googlebot")
    ).toBe(true);
  });

  it("gives answer engines and training crawlers comparable weight, so the split has a story", () => {
    const sum = (family: string) =>
      rows.filter((r) => r.family === family).reduce((a, r) => a + r.hits, 0);
    const answers = sum("answers");
    const training = sum("training");
    expect(answers).toBeGreaterThan(500);
    expect(training).toBeGreaterThan(500);
    expect(answers / training).toBeGreaterThan(0.7);
    expect(answers / training).toBeLessThan(1.6);
  });
});
