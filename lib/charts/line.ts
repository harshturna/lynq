/**
 * The trend line (design §7): the primary series in ink with a faint area,
 * the previous period dotted in the compare colour, a tooltip that shows both
 * values and the change. Pure: arrays in, an option out.
 */
import type { Granularity } from "@/lib/query/ranges";
import type { ChartOption } from "./echarts";
import {
  bucketLabel,
  bucketTitle,
  fmtNumber,
  type Point,
  pctChange,
} from "./format";
import { TOKENS } from "./theme";

export type LineSeries = {
  name: string;
  points: Point[];
  /** Same length as points, aligned by index; the previous period's values. */
  previous?: Point[];
  /** Ink (default) for the page's lead trend, accent for an entity's trend. */
  color?: "ink" | "accent";
  /** Format a value for the tooltip and axis (default: number with separators). */
  format?: (v: number) => string;
};

export type LineOptions = {
  granularity: Granularity;
  /** The site timezone; bucket labels are formatted in it. */
  timezone?: string;
  height?: number;
  /** Fix the axis top (e.g. percentages) instead of letting it fit the data. */
  max?: number;
  /** A horizontal threshold with a label, drawn in the poor colour. */
  threshold?: { value: number; label: string };
  animation?: boolean;
};

export function lineOption(
  series: LineSeries[],
  opts: LineOptions
): ChartOption {
  const primary = series[0];
  const labels =
    primary?.points.map((p) =>
      bucketLabel(p.t, opts.granularity, opts.timezone)
    ) ?? [];
  const fmt = primary?.format ?? fmtNumber;
  const seriesOptions: object[] = [];
  const stroke = (s: LineSeries, i: number) =>
    s.color === "accent" || (i > 0 && !s.color) ? TOKENS.teal : TOKENS.ink;

  series.forEach((s, i) => {
    if (s.previous) {
      seriesOptions.push({
        name: `${s.name}, previous period`,
        type: "line",
        data: s.previous.map((p) => p.v),
        lineStyle: { color: TOKENS.compare, width: 1.2, type: [1.5, 3] },
        itemStyle: { color: TOKENS.compare },
        showSymbol: false,
        emphasis: { disabled: true },
        z: 1,
      });
    }
    seriesOptions.push({
      name: s.name,
      type: "line",
      data: s.points.map((p) => p.v),
      lineStyle: { color: stroke(s, i), width: 1.6 },
      itemStyle: {
        color: stroke(s, i),
        borderColor: TOKENS.canvas,
        borderWidth: 2,
      },
      areaStyle: i === 0 ? { color: TOKENS.teal, opacity: 0.045 } : undefined,
      showSymbol: false,
      symbolSize: 8,
      z: 2,
    });
  });

  const markLine = opts.threshold
    ? {
        silent: true,
        symbol: "none",
        lineStyle: { color: TOKENS.poor, type: [3, 3], width: 1, opacity: 0.7 },
        label: {
          formatter: opts.threshold.label,
          color: TOKENS.poor,
          fontSize: 11,
          position: "insideEndTop",
        },
        data: [{ yAxis: opts.threshold.value }],
      }
    : undefined;
  if (markLine && seriesOptions.length)
    Object.assign(seriesOptions[seriesOptions.length - 1], { markLine });

  return {
    animation: opts.animation ?? true,
    animationDuration: 300,
    grid: { left: 44, right: 12, top: 16, bottom: 28 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: labels,
      axisLabel: { hideOverlap: true, margin: 10 },
    },
    yAxis: {
      type: "value",
      max: opts.max,
      minInterval: 1,
      axisLabel: { formatter: (v: number) => fmt(v) },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "line",
        lineStyle: { color: TOKENS.faint, type: [2, 3] },
      },
      formatter: (params: unknown) => {
        const items = (Array.isArray(params) ? params : [params]) as {
          seriesName: string;
          dataIndex: number;
          value: number;
        }[];
        const idx = items[0]?.dataIndex ?? 0;
        const title = primary
          ? bucketTitle(
              primary.points[idx]?.t ?? "",
              opts.granularity,
              opts.timezone
            )
          : "";
        const lines = series.map((s) => {
          const cur = s.points[idx]?.v ?? 0;
          const prev = s.previous?.[idx]?.v;
          const change = pctChange(cur, prev);
          const f = s.format ?? fmtNumber;
          return `${s.name}: <b>${f(cur)}</b>${prev !== undefined ? ` · ${f(prev)} before${change ? ` · ${change}` : ""}` : ""}`;
        });
        return `<div style="font-weight:500;margin-bottom:2px">${title}</div>${lines.join("<br>")}`;
      },
    },
    series: seriesOptions,
  };
}
