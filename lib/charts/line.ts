/**
 * The trend line (design §7, D-010): the primary series in teal over a
 * vertical gradient, smoothed, the previous period a thin solid grey line
 * behind it, the last point marked, a tooltip that shows both values and the
 * change. Pure: arrays in, an option out.
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
import type { NoteMarker } from "./notes";
import { TOKENS } from "./theme";

export type LineSeries = {
  name: string;
  points: Point[];
  /** Same length as points, aligned by index; the previous period's values. */
  previous?: Point[];
  /** Accent (default, D-010), ink, or muted grey for a third series. */
  color?: "ink" | "accent" | "muted";
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
  /** Notes folded to buckets (notes.ts): a dashed ink hairline and a label per bucket. */
  notes?: NoteMarker[];
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
  const stroke = (s: LineSeries) =>
    s.color === "ink"
      ? TOKENS.ink
      : s.color === "muted"
        ? TOKENS.compare
        : TOKENS.teal;

  series.forEach((s, i) => {
    if (s.previous) {
      seriesOptions.push({
        name: `${s.name}, previous period`,
        type: "line",
        data: s.previous.map((p) => p.v),
        lineStyle: { color: TOKENS.compare, width: 1.2, opacity: 0.6 },
        itemStyle: { color: TOKENS.compare },
        smooth: 0.35,
        smoothMonotone: "x",
        showSymbol: false,
        emphasis: { disabled: true },
        z: 1,
      });
    }
    const last = s.points.length - 1;
    seriesOptions.push({
      name: s.name,
      type: "line",
      data: s.points.map((p, j) =>
        j === last ? { value: p.v, symbol: "circle", symbolSize: 7 } : p.v
      ),
      lineStyle: { color: stroke(s), width: 1.75 },
      itemStyle: {
        color: stroke(s),
        borderColor: TOKENS.canvas,
        borderWidth: 2,
      },
      areaStyle:
        i === 0
          ? {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: "rgba(15,118,110,0.18)" },
                  { offset: 1, color: "rgba(15,118,110,0)" },
                ],
              },
            }
          : undefined,
      smooth: 0.35,
      smoothMonotone: "x",
      showSymbol: true,
      symbol: "none",
      symbolSize: 8,
      z: 2,
    });
  });

  // Marks ride on a series' single markLine, each item carrying its own
  // style: the threshold (poor, on the last series) and the notes (D-010,
  // docs/design/notes-on-charts.md §4: a dashed ink hairline per bucket with
  // a dot at the top and the text as label, on the primary). Silent, so a
  // mark never takes the tooltip from the line.
  const attach = (target: object, items: object[], symbol: unknown) => {
    const existing = (target as { markLine?: { data?: object[] } }).markLine;
    Object.assign(target, {
      markLine: {
        silent: true,
        animation: false,
        // ECharts reads the end symbols from the markLine, not the item
        symbol,
        symbolSize: 6,
        data: [...(existing?.data ?? []), ...items],
      },
    });
  };
  if (opts.threshold && seriesOptions.length)
    attach(
      seriesOptions[seriesOptions.length - 1],
      [
        {
          yAxis: opts.threshold.value,
          symbol: "none",
          lineStyle: {
            color: TOKENS.poor,
            type: [3, 3],
            width: 1,
            opacity: 0.7,
          },
          label: {
            formatter: opts.threshold.label,
            color: TOKENS.poor,
            fontSize: 11,
            position: "insideEndTop",
          },
        },
      ],
      "none"
    );
  const notes = (opts.notes ?? []).filter(
    (n) => n.index >= 0 && n.index < labels.length
  );
  const primaryIndex = seriesOptions.findIndex(
    (s) => (s as { name?: string }).name === primary?.name
  );
  // The text never goes on the plot (TICKET-087): a marker is a faint pin
  // with an ink dot at the top; the sentence lives in the tooltip, the hidden
  // table and the strip under the chart, so markers in adjacent buckets
  // cannot collide.
  if (notes.length && primaryIndex >= 0)
    attach(
      seriesOptions[primaryIndex],
      notes.map((n) => ({
        xAxis: n.index,
        name: n.label,
        lineStyle: {
          color: TOKENS.faint,
          type: [2, 3],
          width: 1,
          opacity: 0.8,
        },
        itemStyle: { color: TOKENS.ink },
        label: { show: false },
      })),
      ["none", "circle"]
    );
  const noteTexts = new Map(notes.map((n) => [n.index, n.texts]));

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
        const texts = noteTexts.get(idx);
        const noteHtml = texts?.length
          ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.18);color:#d8d8dc">${texts
              .map(
                (t) =>
                  `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#fff;margin-right:6px;vertical-align:1px"></span>${escapeHtml(t)}`
              )
              .join("<br>")}</div>`
          : "";
        return `<div style="font-weight:500;margin-bottom:2px">${title}</div>${lines.join("<br>")}${noteHtml}`;
      },
    },
    series: seriesOptions,
  };
}

/** Note text is the owner's, but a tooltip is HTML; keep the sentence a sentence. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
