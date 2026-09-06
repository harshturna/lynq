import { describe, expect, it } from "vitest";
import { noteMarkers } from "./notes";

const points = [
  { t: "2026-09-01T00:00:00.000Z", v: 1 },
  { t: "2026-09-02T00:00:00.000Z", v: 2 },
  { t: "2026-09-03T00:00:00.000Z", v: 3 },
];

describe("noteMarkers", () => {
  it("lands each note in the last bucket that starts at or before it", () => {
    const m = noteMarkers(
      [
        { id: 1, at: "2026-09-02T15:00:00Z", text: "Deployed v2" },
        { id: 2, at: "2026-09-03T00:00:00Z", text: "Product Hunt" },
        {
          id: 3,
          at: "2026-09-09T00:00:00Z",
          text: "After the range, last bucket",
        },
      ],
      points
    );
    expect(m.map((x) => [x.index, x.label])).toEqual([
      [1, "Deployed v2"],
      [2, "2 notes"],
    ]);
    expect(m[1].texts).toEqual([
      "Product Hunt",
      "After the range, last bucket",
    ]);
  });
  it("drops a note before the first bucket, and an unparseable one", () => {
    expect(
      noteMarkers(
        [
          { id: 1, at: "2026-08-30T00:00:00Z", text: "too early" },
          { id: 2, at: "not a date", text: "rubbish" },
        ],
        points
      )
    ).toEqual([]);
    expect(noteMarkers([], points)).toEqual([]);
    expect(noteMarkers([{ id: 1, at: points[0].t, text: "x" }], [])).toEqual(
      []
    );
  });
  it("shortens a long label and keeps the full text", () => {
    const text = "Launched the new pricing page and the annual plan";
    const [m] = noteMarkers([{ id: 1, at: points[0].t, text }], points);
    expect(m.label).toBe("Launched the new pricing pa…");
    expect(m.label.length).toBe(28);
    expect(m.texts).toEqual([text]);
  });
});
