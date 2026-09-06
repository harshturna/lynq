import { describe, expect, it } from "vitest";
import { dotplotOption } from "./dotplot";
import { bucketHours, heatmapOption } from "./heatmap";
import { histogramOption, makeBins } from "./histogram";
import {
  funnelThreshold,
  heatmapThreshold,
  histogramThreshold,
} from "./thresholds";

// biome-ignore lint/suspicious/noExplicitAny: option shapes are loosely typed
type Any = any;

describe("heatmap", () => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  it("buckets 24 hours into 8 three-hour columns", () => {
    expect(bucketHours(hours)).toEqual([3, 12, 21, 30, 39, 48, 57, 66]);
  });
  it("emits one cell per row and hour", () => {
    const o = heatmapOption([{ key: "CA", label: "Canada", hours }], {}) as Any;
    expect(o.series[0].data).toHaveLength(24);
    expect(o.series[0].data[5]).toEqual([5, 0, 5]);
    expect(o.visualMap.max).toBe(23);
    const b = heatmapOption([{ key: "CA", label: "Canada", hours }], {
      bucketed: true,
    }) as Any;
    expect(b.xAxis.data).toHaveLength(8);
    expect(b.series[0].data).toHaveLength(8);
  });
});

describe("histogram", () => {
  it("builds bins from edges with tones", () => {
    const bins = makeBins(
      [0, 640, 1024, 1280, 4000],
      [10, 20, 30, 5],
      (from) => (from >= 1024 ? "accent" : "muted")
    );
    expect(bins).toHaveLength(4);
    expect(bins[1]).toMatchObject({
      label: "640–1024",
      from: 640,
      to: 1024,
      count: 20,
      tone: "muted",
    });
    expect(bins[2].tone).toBe("accent");
  });
  it("places markers between bins by value", () => {
    const bins = makeBins([0, 500, 1000, 1500], [1, 2, 3]);
    const o = histogramOption(bins, {
      name: "Sessions",
      markersAt: [
        { value: 1000, label: "lg" },
        { value: 250, label: "sm" },
      ],
    }) as Any;
    const marks = o.series[0].markLine.data;
    expect(marks[0]).toMatchObject({ name: "lg", xAxis: 1.5 });
    expect(marks[1]).toMatchObject({ name: "sm", xAxis: 0 });
  });
});

describe("dot plot", () => {
  const rows = [
    { key: "search", label: "Organic Search", value: 4.2 },
    { key: "social", label: "Social", value: 1.1 },
  ];
  const o = dotplotOption(rows, {
    reference: 3,
    referenceLabel: "site average",
  }) as Any;
  it("marks the reference and flags rows above it", () => {
    expect(o.series[1].markLine.data[0].xAxis).toBe(3);
    expect(o.series[1].data.map((d: Any) => d.above)).toEqual([true, false]);
    expect(o.series[1].itemStyle.color({ data: { above: false } })).toBe(
      "#7fbdb6"
    );
  });
  it("scales the axis past the largest value", () => {
    expect(o.xAxis.max).toBeCloseTo(5.04);
  });
});

describe("thresholds", () => {
  it("name the count or the width that is missing", () => {
    expect(heatmapThreshold(29, 900).reason).toMatch(/30 or more sessions/);
    expect(heatmapThreshold(30, 699).reason).toMatch(/wider/);
    expect(heatmapThreshold(30, 700).ok).toBe(true);
    expect(histogramThreshold(49).ok).toBe(false);
    expect(histogramThreshold(50).ok).toBe(true);
    expect(funnelThreshold(9).reason).toMatch(/10 or more/);
  });
});
