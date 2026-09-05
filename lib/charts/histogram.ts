/**
 * Histograms (design §7): viewport widths with breakpoint markers, LCP with
 * the good / needs work / poor bands. A thin wrapper over barOption.
 */
import { type Bar, type BarOptions, barOption } from "./bar";
import type { ChartOption } from "./echarts";

export type HistogramBin = {
  label: string;
  from: number;
  to: number;
  count: number;
  tone?: Bar["tone"];
};

export type HistogramOptions = Omit<BarOptions, "accentLast"> & {
  /** Vertical markers placed at a value on the bin scale, e.g. CSS breakpoints. */
  markersAt?: { value: number; label: string }[];
};

/** Bin edges to bins with counts and a tone from a classifier. */
export function makeBins(
  edges: number[],
  counts: number[],
  tone?: (from: number) => Bar["tone"],
  label?: (from: number, to: number) => string
): HistogramBin[] {
  return edges.slice(0, -1).map((from, i) => {
    const to = edges[i + 1];
    return {
      label: label ? label(from, to) : `${from}–${to}`,
      from,
      to,
      count: counts[i] ?? 0,
      tone: tone?.(from),
    };
  });
}

export function histogramOption(
  bins: HistogramBin[],
  opts: HistogramOptions
): ChartOption {
  const bars: Bar[] = bins.map((b) => ({
    label: b.label,
    value: b.count,
    tone: b.tone ?? "muted",
  }));
  const markers = opts.markersAt?.map((m) => {
    // Place the marker at the bin boundary nearest the value.
    let at = 0;
    bins.forEach((b, i) => {
      if (m.value >= b.from) at = i;
    });
    const frac = bins[at]
      ? (m.value - bins[at].from) / (bins[at].to - bins[at].from)
      : 0;
    return { at: at + Math.max(0, Math.min(1, frac)) - 0.5, label: m.label };
  });
  const { markersAt: _ignored, ...rest } = opts;
  return barOption(bars, { ...rest, markers });
}
