import { describe, expect, it } from "vitest";
import { barOption } from "./bar";
import { bucketLabel, bucketTitle, describeSeries, pctChange } from "./format";
import { lineOption } from "./line";
import { sparklineOption } from "./sparkline";
import { TOKENS } from "./theme";

const points = [
  { t: "2026-09-01T00:00:00.000Z", v: 10 },
  { t: "2026-09-02T00:00:00.000Z", v: 14 },
  { t: "2026-09-03T00:00:00.000Z", v: 12 },
];
const previous = [
  { t: "2026-08-25T00:00:00.000Z", v: 9 },
  { t: "2026-08-26T00:00:00.000Z", v: 9 },
  { t: "2026-08-27T00:00:00.000Z", v: 13 },
];

describe("lineOption", () => {
  it("draws the primary in teal over a gradient and the previous period solid in the compare colour behind it", () => {
    const o = lineOption([{ name: "Visitors", points, previous }], {
      granularity: "day",
    }) as {
      series: {
        name: string;
        lineStyle: { color: string; type?: unknown };
        areaStyle?: unknown;
      }[];
      xAxis: { data: string[] };
    };
    expect(o.xAxis.data).toEqual(["Sep 1", "Sep 2", "Sep 3"]);
    expect(o.series.map((s) => s.name)).toEqual([
      "Visitors, previous period",
      "Visitors",
    ]);
    expect(o.series[0].lineStyle.color).toBe(TOKENS.compare);
    expect(o.series[0].lineStyle.type).toBeUndefined();
    expect(o.series[1].lineStyle.color).toBe(TOKENS.teal);
    expect(o.series[1].areaStyle).toBeDefined();
    const ink = lineOption([{ name: "V", points, color: "ink" }], {
      granularity: "day",
    }) as { series: { lineStyle: { color: string }; data: unknown[] }[] };
    expect(ink.series[0].lineStyle.color).toBe(TOKENS.ink);
    expect(ink.series[0].data[2]).toMatchObject({
      value: 12,
      symbol: "circle",
    });
  });

  it("formats the tooltip with both values and the change, and adds a threshold line", () => {
    const o = lineOption(
      [{ name: "LCP", points, format: (v) => `${v}s`, color: "accent" }],
      {
        granularity: "day",
        threshold: { value: 2.5, label: "2.5s" },
      }
    ) as {
      tooltip: { formatter: (p: unknown) => string };
      series: { markLine?: { data: { yAxis: number }[] } }[];
    };
    const html = o.tooltip.formatter([
      { seriesName: "LCP", dataIndex: 1, value: 14 },
    ]);
    expect(html).toContain("Wed, Sep 2, 2026");
    expect(html).toContain("<b>14s</b>");
    expect(o.series.at(-1)?.markLine?.data[0].yAxis).toBe(2.5);
    const withPrev = lineOption([{ name: "V", points, previous }], {
      granularity: "day",
    }) as { tooltip: { formatter: (p: unknown) => string } };
    expect(withPrev.tooltip.formatter([{ dataIndex: 1 }])).toContain("▲ 55.6%");
  });

  it("draws notes as faint pins on the primary series, no label, and repeats them in the tooltip", () => {
    const o = lineOption([{ name: "Visitors", points, previous }], {
      granularity: "day",
      notes: [
        { index: 1, label: "Deployed v2", texts: ["Deployed v2"] },
        {
          index: 2,
          label: "2 notes",
          texts: ["Product Hunt", "Newsletter <b>"],
        },
        { index: 9, label: "off the chart", texts: ["off the chart"] },
      ],
    }) as {
      tooltip: { formatter: (p: unknown) => string };
      series: {
        name: string;
        markLine?: {
          silent: boolean;
          symbol: unknown;
          data: {
            xAxis: number;
            label: { show: boolean };
            lineStyle: { color: string };
          }[];
        };
      }[];
    };
    // on the primary, not on the previous-period line, and only inside the range
    expect(o.series[0].markLine).toBeUndefined();
    const marks = o.series[1].markLine;
    expect(marks?.silent).toBe(true);
    expect(marks?.symbol).toEqual(["none", "circle"]);
    expect(marks?.data.map((d) => d.xAxis)).toEqual([1, 2]);
    expect(marks?.data.every((d) => d.label.show === false)).toBe(true);
    expect(marks?.data[0].lineStyle.color).toBe(TOKENS.faint);
    const html = o.tooltip.formatter([{ dataIndex: 2 }]);
    expect(html).toContain("Product Hunt");
    expect(html).toContain("Newsletter &lt;b&gt;");
    expect(o.tooltip.formatter([{ dataIndex: 0 }])).not.toContain(
      "Product Hunt"
    );
    // a threshold and notes on the same series share one markLine
    const both = lineOption([{ name: "LCP", points }], {
      granularity: "day",
      threshold: { value: 2.5, label: "2.5s" },
      notes: [{ index: 0, label: "Deploy", texts: ["Deploy"] }],
    }) as { series: { markLine?: { data: object[] } }[] };
    expect(both.series[0].markLine?.data).toHaveLength(2);
  });
});

describe("barOption and sparklineOption", () => {
  it("colours the last bar in the accent and bands by tone", () => {
    const o = barOption(
      [
        { label: "-2m", value: 3 },
        { label: "-1m", value: 5, tone: "poor" },
        { label: "now", value: 4 },
      ],
      { name: "Visitors", accentLast: true }
    ) as { series: { data: { itemStyle: { color: string } }[] }[] };
    const colors = o.series[0].data.map((d) => d.itemStyle.color);
    expect(colors).toEqual([TOKENS.teal3, TOKENS.poor, TOKENS.teal]);
  });

  it("makes a sparkline with no axes, no tooltip and no animation", () => {
    const o = sparklineOption([1, 2, 3]) as {
      animation: boolean;
      tooltip: { show: boolean };
      xAxis: { show: boolean };
    };
    expect(o.animation).toBe(false);
    expect(o.tooltip.show).toBe(false);
    expect(o.xAxis.show).toBe(false);
  });
});

describe("format helpers", () => {
  it("labels buckets by granularity", () => {
    expect(bucketLabel("2026-09-01T14:00:00.000Z", "hour", "UTC")).toMatch(
      /PM|AM/
    );
    expect(bucketLabel("2026-09-01T00:00:00.000Z", "month", "UTC")).toBe(
      "Sep 2026"
    );
    expect(bucketTitle("2026-08-31T00:00:00.000Z", "week", "UTC")).toBe(
      "Aug 31 – Sep 6, 2026"
    );
  });
  it("describes a series in one sentence", () => {
    expect(describeSeries("Visitors", points, "day", "UTC")).toBe(
      "Visitors: 36 in total over 3 days, rising; highest 14 on Wed, Sep 2, 2026, lowest 10 on Tue, Sep 1, 2026."
    );
    expect(pctChange(10, 0)).toBe("new");
    expect(pctChange(10, 10)).toBe("no change");
  });
});
