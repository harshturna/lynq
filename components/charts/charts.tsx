"use client";

import { useMemo } from "react";
import { type Bar, type BarOptions, barOption } from "@/lib/charts/bar";
import { bucketTitle, describeSeries, fmtNumber } from "@/lib/charts/format";
import {
  type LineOptions,
  type LineSeries,
  lineOption,
} from "@/lib/charts/line";
import { sparklineOption } from "@/lib/charts/sparkline";
import { Chart, type MarkClick } from "./chart";
import { HiddenTable } from "./hidden-table";

/**
 * The chart components screens use (design §7): each builds its option with
 * a pure builder, generates the description, and renders its table equivalent.
 */
export function LineChart({
  title,
  series,
  height = 240,
  onMarkClick,
  ...opts
}: {
  title: string;
  series: LineSeries[];
  height?: number;
  onMarkClick?: (m: MarkClick) => void;
} & LineOptions) {
  const { granularity, timezone, max, threshold, animation } = opts;
  // biome-ignore lint/correctness/useExhaustiveDependencies: opts is a fresh rest object each render; its fields are the real inputs
  const option = useMemo(
    () =>
      lineOption(series, { granularity, timezone, max, threshold, animation }),
    [
      series,
      granularity,
      timezone,
      max,
      threshold?.value,
      threshold?.label,
      animation,
    ]
  );
  const primary = series[0];
  const description = primary
    ? describeSeries(primary.name, primary.points, granularity, timezone)
    : `${title}: no data.`;
  const columns = [
    "Period",
    ...series.flatMap((s) =>
      s.previous ? [s.name, `${s.name}, previous period`] : [s.name]
    ),
  ];
  const rows = (primary?.points ?? []).map((p, i) => [
    bucketTitle(p.t, granularity, timezone),
    ...series.flatMap((s) => {
      const f = s.format ?? fmtNumber;
      const cur = f(s.points[i]?.v ?? 0);
      return s.previous ? [cur, f(s.previous[i]?.v ?? 0)] : [cur];
    }),
  ]);
  return (
    <Chart
      option={option}
      height={height}
      title={title}
      description={description}
      onMarkClick={onMarkClick}
      table={<HiddenTable caption={title} columns={columns} rows={rows} />}
    />
  );
}

export function BarChart({
  title,
  bars,
  height = 160,
  onMarkClick,
  ...opts
}: {
  title: string;
  bars: Bar[];
  height?: number;
  onMarkClick?: (m: MarkClick) => void;
} & BarOptions) {
  const { name, accentLast, max, labelEvery, format, markers, animation } =
    opts;
  const option = useMemo(
    () =>
      barOption(bars, {
        name,
        accentLast,
        max,
        labelEvery,
        format,
        markers,
        animation,
      }),
    [bars, name, accentLast, max, labelEvery, format, markers, animation]
  );
  const total = bars.reduce((a, b) => a + b.value, 0);
  const top = bars.reduce(
    (m, b) => (b.value > m.value ? b : m),
    bars[0] ?? { label: "", value: 0 }
  );
  const fmt = opts.format ?? fmtNumber;
  const description = bars.length
    ? `${opts.name}: ${fmt(total)} across ${bars.length} bars; highest ${fmt(top.value)} at ${top.label}.`
    : `${opts.name}: no data.`;
  return (
    <Chart
      option={option}
      height={height}
      title={title}
      description={description}
      onMarkClick={onMarkClick}
      table={
        <HiddenTable
          caption={title}
          columns={["Bucket", opts.name]}
          rows={bars.map((b) => [b.label, fmt(b.value)])}
        />
      }
    />
  );
}

/** Inline in a table cell; not focusable and carries only a trend label (design §7). */
export function Sparkline({
  values,
  label,
  accent,
}: {
  values: number[];
  label: string;
  accent?: boolean;
}) {
  const option = useMemo(
    () => sparklineOption(values, { accent }),
    [values, accent]
  );
  return (
    <span
      className="inline-block h-[18px] w-16 align-middle"
      role="img"
      aria-label={label}
    >
      <Chart
        option={option}
        height={18}
        title={label}
        description={label}
        className="pointer-events-none"
      />
    </span>
  );
}

/** "Trend: up 14%" from a series, for the sparkline's label. */
export function trendLabel(values: number[]): string {
  if (values.length < 2) return "Trend: not enough data";
  const half = Math.floor(values.length / 2);
  const a = values.slice(0, half).reduce((x, y) => x + y, 0) / half;
  const b =
    values.slice(half).reduce((x, y) => x + y, 0) / (values.length - half);
  if (a === 0) return b > 0 ? "Trend: up" : "Trend: flat";
  const pct = ((b - a) / a) * 100;
  if (Math.abs(pct) < 1) return "Trend: flat";
  return `Trend: ${pct > 0 ? "up" : "down"} ${Math.abs(pct).toFixed(0)}%`;
}
