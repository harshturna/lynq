/**
 * The dot plot (design §7): one value per row on a shared axis against a
 * reference line; a row above the reference is teal, below a lighter teal (D-013).
 */
import type { ChartOption } from "./echarts";
import { TOKENS } from "./theme";

export type DotRow = { key: string; label: string; value: number };

export type DotPlotOptions = {
  reference: number;
  referenceLabel: string;
  max?: number;
  format?: (v: number) => string;
  animation?: boolean;
};

export function dotplotOption(
  rows: DotRow[],
  opts: DotPlotOptions
): ChartOption {
  const f = opts.format ?? ((v: number) => `${v}%`);
  const max =
    opts.max ?? Math.max(...rows.map((r) => r.value), opts.reference) * 1.2;
  return {
    animation: opts.animation ?? true,
    animationDuration: 300,
    grid: { left: 120, right: 48, top: 22, bottom: 26 },
    xAxis: {
      type: "value",
      min: 0,
      max,
      axisLabel: { formatter: (v: number) => f(v) },
      splitNumber: 3,
    },
    yAxis: {
      type: "category",
      data: rows.map((r) => r.label),
      inverse: true,
      axisLabel: { color: TOKENS.ink, fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    tooltip: {
      formatter: (p: unknown) => {
        const d = (p as { name: string; value: number }).value;
        const name = (p as { name: string }).name;
        const diff = d - opts.reference;
        return `<div style="font-weight:500">${name}</div>${f(d)} · ${diff >= 0 ? "▲" : "▼"} ${f(Math.abs(Number(diff.toFixed(1))))} vs ${opts.referenceLabel}`;
      },
    },
    series: [
      // The stem from the reference to the value.
      {
        type: "bar",
        data: rows.map((r) => ({ value: [r.value, r.label] })),
        barWidth: 3,
        silent: true,
        itemStyle: { color: TOKENS.rule },
        z: 1,
      },
      {
        type: "scatter",
        data: rows.map((r) => ({
          name: r.label,
          value: [r.value, r.label],
          above: r.value >= opts.reference,
        })),
        symbolSize: 12,
        itemStyle: {
          color: (p: unknown) =>
            (p as { data: { above: boolean } }).data.above
              ? TOKENS.teal
              : TOKENS.teal2,
          borderColor: (p: unknown) =>
            (p as { data: { above: boolean } }).data.above
              ? TOKENS.teal
              : TOKENS.teal2,
          borderWidth: 1.5,
        },
        label: {
          show: true,
          position: "right",
          color: TOKENS.ink,
          fontSize: 11,
          formatter: (p: unknown) =>
            f((p as { value: [number, string] }).value[0]),
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: TOKENS.mute, type: [3, 3], width: 1 },
          label: {
            formatter: `${opts.referenceLabel} ${f(opts.reference)}`,
            color: TOKENS.mute,
            fontSize: 11,
            position: "start",
          },
          data: [{ xAxis: opts.reference }],
        },
        z: 2,
      },
    ],
  };
}
