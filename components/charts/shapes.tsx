"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DotPlotOptions,
  type DotRow,
  dotplotOption,
} from "@/lib/charts/dotplot";
import { fmtNumber } from "@/lib/charts/format";
import { type HeatmapRow, heatmapOption } from "@/lib/charts/heatmap";
import {
  type HistogramBin,
  type HistogramOptions,
  histogramOption,
} from "@/lib/charts/histogram";
import {
  type QuadrantOptions,
  type QuadrantPoint,
  quadrantOption,
} from "@/lib/charts/quadrant";
import {
  HEATMAP_BUCKET_BELOW,
  heatmapThreshold,
  histogramThreshold,
  quadrantThreshold,
  treemapThreshold,
} from "@/lib/charts/thresholds";
import {
  type TreemapCell,
  type TreemapOptions,
  treemapCells,
  treemapOption,
} from "@/lib/charts/treemap";
import { Chart, type MarkClick } from "./chart";
import { ChartOrFallback } from "./fallback";
import { HiddenTable } from "./hidden-table";

/**
 * The shape charts (design §7): each builds its option with a pure builder,
 * writes its one-sentence description, renders its table equivalent and
 * gives way to a sentence below its count or width threshold (§12).
 */
export function Treemap({
  title,
  cells,
  height = 260,
  onMarkClick,
  ...opts
}: {
  title: string;
  cells: TreemapCell[];
  height?: number;
  onMarkClick?: (m: MarkClick) => void;
} & TreemapOptions) {
  const { shadeLabel, formatShade, total, animation, unit } = opts;
  const option = useMemo(
    () =>
      treemapOption(cells, { shadeLabel, formatShade, total, animation, unit }),
    [cells, shadeLabel, formatShade, total, animation, unit]
  );
  const all = treemapCells(cells, total);
  const fs = formatShade ?? fmtNumber;
  const top = cells[0];
  const description = top
    ? `${title}: ${cells.length} pages; largest ${top.label} with ${fmtNumber(top.value)} ${unit ?? "visitors"}, ${shadeLabel} ${fs(top.shade)}.`
    : `${title}: no data.`;
  return (
    <ChartOrFallback check={(w) => treemapThreshold(cells.length, w)}>
      <Chart
        option={option}
        height={height}
        title={title}
        description={description}
        onMarkClick={onMarkClick}
        table={
          <HiddenTable
            caption={title}
            columns={["Page", unit ?? "visitors", shadeLabel]}
            rows={all.map((c) => [c.label, fmtNumber(c.value), fs(c.shade)])}
          />
        }
      />
    </ChartOrFallback>
  );
}

export function Quadrant({
  title,
  points,
  height = 300,
  onMarkClick,
  ...opts
}: {
  title: string;
  points: QuadrantPoint[];
  height?: number;
  onMarkClick?: (m: MarkClick) => void;
} & QuadrantOptions) {
  const {
    xLabel,
    yLabel,
    sizeLabel,
    avgX,
    avgY,
    formatY,
    formatSize,
    corners,
    animation,
  } = opts;
  // biome-ignore lint/correctness/useExhaustiveDependencies: corners is a tuple literal at the call site; its text is the input
  const option = useMemo(
    () =>
      quadrantOption(points, {
        xLabel,
        yLabel,
        sizeLabel,
        avgX,
        avgY,
        formatY,
        formatSize,
        corners,
        animation,
      }),
    [
      points,
      xLabel,
      yLabel,
      sizeLabel,
      avgX,
      avgY,
      formatY,
      formatSize,
      corners?.join(","),
      animation,
    ]
  );
  const fy = formatY ?? ((v: number) => `${v}%`);
  const fs = formatSize ?? fmtNumber;
  const above = points.filter((p) => p.y >= avgY && p.x >= avgX).length;
  const description = points.length
    ? `${title}: ${points.length} sources against a site average of ${fy(avgY)} ${yLabel.toLowerCase()}; ${above} above average on both axes.`
    : `${title}: no data.`;
  return (
    <ChartOrFallback check={() => quadrantThreshold(points.length)}>
      <Chart
        option={option}
        height={height}
        title={title}
        description={description}
        onMarkClick={onMarkClick}
        table={
          <HiddenTable
            caption={title}
            columns={["Source", xLabel, yLabel, sizeLabel]}
            rows={points.map((p) => [
              p.label,
              fmtNumber(p.x),
              fy(p.y),
              fs(p.size),
            ])}
          />
        }
      />
    </ChartOrFallback>
  );
}

export function Heatmap({
  title,
  rows,
  sessions,
  unit = "visitors",
  height,
  onMarkClick,
  animation,
}: {
  title: string;
  rows: HeatmapRow[];
  /** Sessions in the range, for the count threshold. */
  sessions: number;
  unit?: string;
  height?: number;
  onMarkClick?: (m: MarkClick) => void;
  animation?: boolean;
}) {
  const h = height ?? Math.max(120, rows.length * 26 + 40);
  const peak = rows.reduce(
    (m, r) => {
      const hour = r.hours.indexOf(Math.max(...r.hours));
      const v = r.hours[hour] ?? 0;
      return v > m.v ? { label: r.label, hour, v } : m;
    },
    { label: "", hour: 0, v: 0 }
  );
  const description = rows.length
    ? `${title}: ${rows.length} rows by hour of day; busiest ${peak.label} at ${peak.hour}:00 with ${fmtNumber(peak.v)} ${unit}.`
    : `${title}: no data.`;
  return (
    <ChartOrFallback check={(w) => heatmapThreshold(sessions, w)}>
      <HeatmapInner
        title={title}
        rows={rows}
        unit={unit}
        height={h}
        description={description}
        onMarkClick={onMarkClick}
        animation={animation}
      />
    </ChartOrFallback>
  );
}

function HeatmapInner({
  title,
  rows,
  unit,
  height,
  description,
  onMarkClick,
  animation,
}: {
  title: string;
  rows: HeatmapRow[];
  unit: string;
  height: number;
  description: string;
  onMarkClick?: (m: MarkClick) => void;
  animation?: boolean;
}) {
  const bucketed = useNarrow(HEATMAP_BUCKET_BELOW);
  const option = useMemo(
    () => heatmapOption(rows, { bucketed, unit, animation }),
    [rows, bucketed, unit, animation]
  );
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
          columns={["Row", ...Array.from({ length: 24 }, (_, i) => `${i}:00`)]}
          rows={rows.map((r) => [r.label, ...r.hours.map(fmtNumber)])}
        />
      }
    />
  );
}

export function Histogram({
  title,
  bins,
  samples,
  height = 180,
  onMarkClick,
  ...opts
}: {
  title: string;
  bins: HistogramBin[];
  /** Samples in the range, for the count threshold. */
  samples: number;
  height?: number;
  onMarkClick?: (m: MarkClick) => void;
} & HistogramOptions) {
  const { name, max, labelEvery, format, markersAt, animation } = opts;
  const option = useMemo(
    () =>
      histogramOption(bins, {
        name,
        max,
        labelEvery,
        format,
        markersAt,
        animation,
      }),
    [bins, name, max, labelEvery, format, markersAt, animation]
  );
  const total = bins.reduce((a, b) => a + b.count, 0);
  const top = bins.reduce(
    (m, b) => (b.count > m.count ? b : m),
    bins[0] ?? { label: "", count: 0 }
  );
  const share = (n: number) =>
    total ? `${((n / total) * 100).toFixed(1)}%` : "—";
  const description = bins.length
    ? `${title}: ${fmtNumber(total)} ${name.toLowerCase()} across ${bins.length} bands; most in ${top.label} (${share(top.count)}).`
    : `${title}: no data.`;
  return (
    <ChartOrFallback check={() => histogramThreshold(samples)}>
      <Chart
        option={option}
        height={height}
        title={title}
        description={description}
        onMarkClick={onMarkClick}
        table={
          <HiddenTable
            caption={title}
            columns={["Band", name, "Share"]}
            rows={bins.map((b) => [
              b.label,
              fmtNumber(b.count),
              share(b.count),
            ])}
          />
        }
      />
    </ChartOrFallback>
  );
}

export function DotPlot({
  title,
  rows,
  height,
  onMarkClick,
  ...opts
}: {
  title: string;
  rows: DotRow[];
  height?: number;
  onMarkClick?: (m: MarkClick) => void;
} & DotPlotOptions) {
  const { reference, referenceLabel, max, format, animation } = opts;
  const option = useMemo(
    () =>
      dotplotOption(rows, {
        reference,
        referenceLabel,
        max,
        format,
        animation,
      }),
    [rows, reference, referenceLabel, max, format, animation]
  );
  const f = format ?? ((v: number) => `${v}%`);
  const above = rows.filter((r) => r.value >= reference).length;
  const description = rows.length
    ? `${title}: ${rows.length} rows against ${referenceLabel} ${f(reference)}; ${above} at or above it.`
    : `${title}: no data.`;
  const h = height ?? Math.max(120, rows.length * 30 + 40);
  return (
    <Chart
      option={option}
      height={h}
      title={title}
      description={description}
      onMarkClick={onMarkClick}
      table={
        <HiddenTable
          caption={title}
          columns={["Row", "Rate", `Against ${referenceLabel}`]}
          rows={rows.map((r) => [
            r.label,
            f(r.value),
            `${r.value >= reference ? "+" : "−"}${f(Math.abs(Number((r.value - reference).toFixed(1))))}`,
          ])}
        />
      }
    />
  );
}

/** True while the viewport is narrower than `px`; false on the server. */
function useNarrow(px: number): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${px - 1}px)`);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [px]);
  return narrow;
}
