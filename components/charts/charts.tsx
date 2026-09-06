"use client";

import { formatInTimeZone } from "date-fns-tz";
import { useMemo } from "react";
import { type Bar, type BarOptions, barOption } from "@/lib/charts/bar";
import { bucketTitle, describeSeries, fmtNumber } from "@/lib/charts/format";
import {
  type LineOptions,
  type LineSeries,
  lineOption,
} from "@/lib/charts/line";
import { type ChartNote, noteMarkers } from "@/lib/charts/notes";
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
  notes,
  ...opts
}: {
  title: string;
  series: LineSeries[];
  height?: number;
  onMarkClick?: (m: MarkClick) => void;
  /** Notes inside the range; folded to the primary series' buckets here. */
  notes?: ChartNote[];
} & Omit<LineOptions, "notes">) {
  const { granularity, timezone, max, threshold, animation } = opts;
  const primary = series[0];
  const markers = useMemo(
    () => (notes?.length && primary ? noteMarkers(notes, primary.points) : []),
    [notes, primary]
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: opts is a fresh rest object each render; its fields are the real inputs
  const option = useMemo(
    () =>
      lineOption(series, {
        granularity,
        timezone,
        max,
        threshold,
        animation,
        notes: markers,
      }),
    [
      series,
      granularity,
      timezone,
      max,
      threshold?.value,
      threshold?.label,
      animation,
      markers,
    ]
  );
  const description = primary
    ? describeSeries(primary.name, primary.points, granularity, timezone) +
      (markers.length
        ? ` ${notes?.length ?? 0} ${notes?.length === 1 ? "note" : "notes"} marked.`
        : "")
    : `${title}: no data.`;
  const byIndex = new Map(markers.map((m) => [m.index, m.texts.join("; ")]));
  const columns = [
    "Period",
    ...series.flatMap((s) =>
      s.previous ? [s.name, `${s.name}, previous period`] : [s.name]
    ),
    ...(markers.length ? ["Notes"] : []),
  ];
  const rows = (primary?.points ?? []).map((p, i) => [
    bucketTitle(p.t, granularity, timezone),
    ...series.flatMap((s) => {
      const f = s.format ?? fmtNumber;
      const cur = f(s.points[i]?.v ?? 0);
      return s.previous ? [cur, f(s.previous[i]?.v ?? 0)] : [cur];
    }),
    ...(markers.length ? [byIndex.get(i) ?? ""] : []),
  ]);
  return (
    <div className="flex flex-col gap-2">
      <Chart
        option={option}
        height={height}
        title={title}
        description={description}
        onMarkClick={onMarkClick}
        table={<HiddenTable caption={title} columns={columns} rows={rows} />}
      />
      {markers.length > 0 && notes && (
        <NotesStrip
          notes={notes}
          timezone={timezone}
          granularity={granularity}
        />
      )}
    </div>
  );
}

/**
 * The notes in the range, under the chart, so the text never sits on the
 * plot where markers in adjacent buckets would collide (TICKET-087).
 */
function NotesStrip({
  notes,
  timezone = "UTC",
  granularity,
}: {
  notes: ChartNote[];
  timezone?: string;
  granularity: LineOptions["granularity"];
}) {
  const sorted = [...notes].sort((a, b) => a.at.localeCompare(b.at));
  const when = (iso: string) =>
    formatInTimeZone(
      new Date(iso),
      timezone,
      granularity === "hour" ? "MMM d, h:mm a" : "MMM d"
    );
  return (
    <ul
      aria-label="Notes in this range"
      className="flex flex-wrap gap-x-5 gap-y-1 px-1 text-[12px] text-ink-2"
    >
      {sorted.map((n) => (
        <li key={n.id} className="flex items-baseline gap-[6px]">
          <span
            aria-hidden
            className="inline-block h-[6px] w-[6px] translate-y-[-1px] rounded-full bg-ink"
          />
          <span className="whitespace-nowrap text-mute tabular">
            {when(n.at)}
          </span>
          <span>{n.text}</span>
        </li>
      ))}
    </ul>
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
          rows={bars.map((b) => [b.title ?? b.label, fmt(b.value)])}
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
