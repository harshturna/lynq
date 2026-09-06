/**
 * Bars (design §7): per-minute realtime, visitors by hour. The last bar is
 * in the accent when it represents "now"; bands can colour bars by status.
 */
import type { ChartOption } from "./echarts";
import { fmtNumber } from "./format";
import { TOKENS } from "./theme";

export type Bar = {
  /** The axis label; blank for unlabelled ticks. */
  label: string;
  /** The row header in the hidden table when the axis label is blank. */
  title?: string;
  value: number /** A colour token name for status bands. */;
  tone?: "good" | "warn" | "poor" | "accent" | "muted";
};

export type BarOptions = {
  name: string;
  /** Colour the last bar in the accent (the current minute). */
  accentLast?: boolean;
  max?: number;
  /** Show every nth label. */
  labelEvery?: number;
  format?: (v: number) => string;
  /** Vertical marker lines with labels (breakpoints). */
  markers?: { at: number; label: string }[];
  animation?: boolean;
};

const TONE: Record<NonNullable<Bar["tone"]>, string> = {
  good: TOKENS.good,
  warn: TOKENS.warn,
  poor: TOKENS.poor,
  accent: TOKENS.teal,
  muted: TOKENS.teal3,
};

export function barOption(bars: Bar[], opts: BarOptions): ChartOption {
  const fmt = opts.format ?? fmtNumber;
  const every = opts.labelEvery ?? 1;
  return {
    animation: opts.animation ?? true,
    animationDuration: 300,
    grid: { left: 36, right: 8, top: 12, bottom: 26 },
    xAxis: {
      type: "category",
      data: bars.map((b) => b.label),
      axisLabel: { interval: every - 1, hideOverlap: true },
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
        type: "shadow",
        shadowStyle: { color: "rgba(10,10,10,0.04)" },
      },
      formatter: (params: unknown) => {
        const p = (Array.isArray(params) ? params[0] : params) as {
          name: string;
          value: number;
        };
        return `<div style="font-weight:500">${p.name}</div>${opts.name}: <b>${fmt(p.value)}</b>`;
      },
    },
    series: [
      {
        name: opts.name,
        type: "bar",
        data: bars.map((b, i) => ({
          value: b.value,
          itemStyle: {
            color: b.tone
              ? TONE[b.tone]
              : opts.accentLast && i === bars.length - 1
                ? TOKENS.teal
                : TOKENS.teal3,
          },
        })),
        barCategoryGap: "38%",
        markLine: opts.markers?.length
          ? {
              silent: true,
              symbol: "none",
              lineStyle: { color: TOKENS.ink2, type: [2, 3], width: 1 },
              // "end" keeps the label horizontal above a vertical line;
              // insideEndTop would rotate it along the line
              label: {
                color: TOKENS.ink2,
                fontSize: 11,
                position: "end",
                distance: 4,
                formatter: (p: { name: string }) => p.name,
              },
              data: opts.markers.map((m) => ({ name: m.label, xAxis: m.at })),
            }
          : undefined,
      },
    ],
  };
}
