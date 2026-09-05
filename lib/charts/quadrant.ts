/**
 * The sources quadrant (design §7): log visitors across, a rate up, bubble
 * size from a third measure, the site averages as the dividing lines, and
 * corner labels derived from the axis.
 */
import type { ChartOption } from "./echarts";
import { fmtNumber } from "./format";
import { TOKENS } from "./theme";

export type QuadrantPoint = {
  key: string;
  label: string;
  x: number;
  y: number;
  size: number;
};

export type QuadrantOptions = {
  xLabel: string;
  yLabel: string;
  sizeLabel: string;
  avgX: number;
  avgY: number;
  formatY?: (v: number) => string;
  formatSize?: (v: number) => string;
  /** Corner labels: [top-left, top-right, bottom-left, bottom-right]. */
  corners?: [string, string, string, string];
  animation?: boolean;
};

export function quadrantOption(
  points: QuadrantPoint[],
  opts: QuadrantOptions
): ChartOption {
  const fy = opts.formatY ?? ((v: number) => `${v}%`);
  const fs = opts.formatSize ?? fmtNumber;
  const maxSize = Math.max(...points.map((p) => p.size), 1);
  const corners = opts.corners ?? [
    "scale these",
    "winning",
    "watch",
    "fix the landing page",
  ];
  const yMax = Math.max(...points.map((p) => p.y), opts.avgY) * 1.15;
  return {
    animation: opts.animation ?? true,
    animationDuration: 300,
    grid: { left: 48, right: 64, top: 20, bottom: 32 },
    xAxis: {
      type: "log",
      name: opts.xLabel,
      nameLocation: "middle",
      nameGap: 22,
      nameTextStyle: { color: TOKENS.mute, fontSize: 11 },
      axisLabel: { formatter: (v: number) => fmtNumber(v) },
      splitLine: { show: false },
      axisLine: { show: true, lineStyle: { color: TOKENS.rule } },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: yMax,
      name: opts.yLabel,
      nameTextStyle: { color: TOKENS.mute, fontSize: 11, align: "left" },
      axisLabel: { formatter: (v: number) => fy(v) },
    },
    tooltip: {
      formatter: (p: unknown) => {
        const d = (
          p as { data: { label: string; x: number; y: number; size: number } }
        ).data;
        return `<div style="font-weight:500">${d.label}</div>${fmtNumber(d.x)} ${opts.xLabel.toLowerCase()} · ${fy(d.y)} ${opts.yLabel.toLowerCase()} · ${fs(d.size)} ${opts.sizeLabel.toLowerCase()}`;
      },
    },
    graphic: [
      corner(corners[0], "left", "top"),
      corner(corners[1], "right", "top"),
      corner(corners[2], "left", "bottom"),
      corner(corners[3], "right", "bottom"),
    ],
    series: [
      {
        type: "scatter",
        data: points.map((p) => ({
          name: p.label,
          value: [p.x, p.y],
          label: p.label,
          x: p.x,
          y: p.y,
          size: p.size,
          key: p.key,
        })),
        symbolSize: (_v: unknown, params: unknown) => {
          const size = (params as { data: { size: number } }).data.size;
          return 8 + Math.sqrt(size / maxSize) * 30;
        },
        itemStyle: {
          color: "rgba(15,118,110,0.18)",
          borderColor: TOKENS.teal,
          borderWidth: 1.5,
        },
        emphasis: { itemStyle: { color: "rgba(15,118,110,0.4)" } },
        label: {
          show: true,
          position: "right",
          color: TOKENS.ink,
          fontSize: 11,
          formatter: (p: unknown) =>
            (p as { data: { label: string } }).data.label,
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: TOKENS.mute, type: [3, 3], width: 1 },
          label: { color: TOKENS.mute, fontSize: 11 },
          data: [
            {
              yAxis: opts.avgY,
              label: {
                formatter: `site average ${fy(opts.avgY)}`,
                position: "insideStartTop",
              },
            },
            { xAxis: opts.avgX, label: { show: false } },
          ],
        },
      },
    ],
  };
}

function corner(text: string, x: "left" | "right", y: "top" | "bottom") {
  return {
    type: "text",
    [x]: x === "left" ? 56 : 28,
    [y]: y === "top" ? 24 : 40,
    style: {
      text,
      fill: TOKENS.faint,
      fontSize: 11,
      fontFamily: "Geist, system-ui, sans-serif",
    },
    silent: true,
  };
}
