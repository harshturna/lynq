/**
 * The country-by-hour heatmap (design §7): rows per value, 24 hour columns in
 * the site timezone with the teal ramp; 3-hour columns under 640 px.
 */
import type { ChartOption } from "./echarts";
import { fmtNumber } from "./format";
import { RAMP, TOKENS } from "./theme";

export type HeatmapRow = { key: string; label: string; hours: number[] };

export type HeatmapOptions = {
  /** Bucket the 24 hours into 3-hour columns (narrow screens). */
  bucketed?: boolean;
  unit?: string;
  animation?: boolean;
};

export function bucketHours(hours: number[], size = 3): number[] {
  const out: number[] = [];
  for (let i = 0; i < hours.length; i += size)
    out.push(hours.slice(i, i + size).reduce((a, b) => a + b, 0));
  return out;
}

export function heatmapOption(
  rows: HeatmapRow[],
  opts: HeatmapOptions = {}
): ChartOption {
  const data = rows.map((r) =>
    opts.bucketed ? bucketHours(r.hours) : r.hours
  );
  const cols = opts.bucketed
    ? Array.from({ length: 8 }, (_, i) => `${i * 3}:00`)
    : Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const max = Math.max(1, ...data.flat());
  const unit = opts.unit ?? "visitors";
  const cells: [number, number, number][] = [];
  data.forEach((row, y) => {
    row.forEach((v, x) => {
      cells.push([x, y, v]);
    });
  });
  return {
    animation: opts.animation ?? true,
    animationDuration: 300,
    grid: { left: 130, right: 12, top: 6, bottom: 26 },
    xAxis: {
      type: "category",
      data: cols,
      axisLabel: { interval: opts.bucketed ? 0 : 5, hideOverlap: true },
      axisLine: { show: false },
      splitArea: { show: false },
    },
    yAxis: {
      type: "category",
      data: rows.map((r) => r.label),
      inverse: true,
      axisLabel: { color: TOKENS.ink2, fontSize: 12 },
      axisLine: { show: false },
      splitLine: { show: false },
    },
    visualMap: { show: false, min: 0, max, inRange: { color: RAMP } },
    tooltip: {
      formatter: (p: unknown) => {
        const v = (p as { value: [number, number, number] }).value;
        return `<div style="font-weight:500">${rows[v[1]]?.label ?? ""} · ${cols[v[0]]}</div>${fmtNumber(v[2])} ${unit}`;
      },
    },
    series: [
      {
        type: "heatmap",
        data: cells,
        itemStyle: {
          borderColor: TOKENS.canvas,
          borderWidth: 2,
          borderRadius: 2,
        },
        emphasis: { itemStyle: { borderColor: TOKENS.teal } },
      },
    ],
  };
}
