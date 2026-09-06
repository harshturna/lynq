import { describe, expect, it } from "vitest";
import { botsLead } from "./lead";

const at = new Date("2026-09-06T10:00:00Z");
const crawler = (
  crawler: string,
  family: "answers" | "training" | "search",
  hits: number
) => ({
  crawler,
  family,
  hits,
  pages: 1,
  last_seen: at,
  total: 1,
});

describe("botsLead", () => {
  it("is null with no hits", () => {
    expect(
      botsLead({ families: [], crawlers: [], orientation: [] })
    ).toBeNull();
  });
  it("leads with answers when they outnumber training, and names the top crawler and llms.txt", () => {
    const lead = botsLead({
      families: [
        { family: "answers", hits: 1204, crawlers: 4, pages: 100 },
        { family: "training", hits: 956, crawlers: 3, pages: 200 },
        { family: "search", hits: 764, crawlers: 2, pages: 150 },
      ],
      crawlers: [crawler("ChatGPT-User", "answers", 612)],
      orientation: [
        { path: "robots.txt", hits: 214, crawlers: 19 },
        { path: "llms.txt", hits: 37, crawlers: 4 },
      ],
    });
    expect(lead?.total).toBe(2924);
    expect(lead?.segments.map((s) => s.label)).toEqual([
      "Answers",
      "Training",
      "Search",
    ]);
    expect(lead?.sentence.opening).toBe(
      "Answer engines fetched pages 1,204 times to answer someone, more than the 956 that training crawlers took for a model."
    );
    expect(lead?.sentence.top).toEqual({ crawler: "ChatGPT-User", hits: 612 });
    expect(lead?.sentence.llms).toBe(4);
  });
  it("leads with training when it wins, and says when the other side is absent", () => {
    const only = botsLead({
      families: [{ family: "training", hits: 30, crawlers: 1, pages: 3 }],
      crawlers: [crawler("GPTBot", "training", 30)],
      orientation: [],
    });
    expect(only?.sentence.opening).toBe(
      "Training crawlers took pages 30 times for a model; no answer engine came."
    );
    expect(only?.sentence.llms).toBe(0);
  });
  it("says so when no AI crawler came at all", () => {
    const lead = botsLead({
      families: [
        { family: "search", hits: 80, crawlers: 2, pages: 10 },
        { family: "seo", hits: 20, crawlers: 1, pages: 10 },
      ],
      crawlers: [crawler("Googlebot", "search", 70)],
      orientation: [],
    });
    expect(lead?.sentence.opening).toBe(
      "No AI crawler yet. Search crawlers made 80 of the 100 hits."
    );
  });
});
