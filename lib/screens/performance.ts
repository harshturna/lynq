import "server-only";
import type { Point } from "@/lib/charts/format";
import type { BuiltContext } from "@/lib/query/authorize";
import {
  histogram,
  vitals,
  vitalsBreakdown,
  vitalsTargets,
  vitalsTimeseries,
} from "@/lib/query/run";
import type { VitalsRow, VitalsSummary } from "@/lib/query/vitals";
import type { DeviceView, ViewState } from "@/lib/url-state";
import { DEVICES } from "@/lib/vitals";
import type { Kpi } from "./kpi";
import { type Section, settle } from "./settle";

/**
 * The Performance screen (design §8.9): p75 vitals with status and deltas,
 * LCP by device against the threshold, the worst-first page table, what is
 * slow on the selected page, and the LCP distribution.
 */
export const PAGE_ROWS = 50;
export const TARGETS = 5;
export const SLOW_COUNTRIES = 5;
export const LCP_BIN_MS = 250;
export const LCP_MAX_MS = 8000;

export type VitalPage = VitalsRow & { value: string };

export type SelectedPage = {
  path: string;
  lcpTargets: { value: string; samples: number; p75: number | null }[];
  inpTargets: { value: string; samples: number; p75: number | null }[];
  countries: VitalPage[];
};

export type PerformanceScreen = {
  compare: boolean;
  kpi: Kpi;
  device: DeviceView;
  granularity: BuiltContext["granularity"];
  timezone: string;
  sel: string | undefined;
  strip: Promise<
    Section<{ current: VitalsSummary; previous: VitalsSummary | null }>
  >;
  byDevice: Promise<Section<Record<string, Point[]>>>;
  pages: Promise<Section<VitalPage[]>>;
  selected: Promise<Section<SelectedPage | null>>;
  distribution: Promise<
    Section<{
      bins: { from: number; to: number | null; count: number }[];
      samples: number;
    }>
  >;
};

export function getPerformanceScreen(
  ctx0: BuiltContext,
  state: ViewState,
  kpi: Kpi
): PerformanceScreen {
  const device: DeviceView = state.device ?? "all";
  const ctx: BuiltContext =
    device === "all"
      ? ctx0
      : {
          ...ctx0,
          filters: [
            ...ctx0.filters,
            { dimension: "device", op: "is", values: [device] },
          ],
        };
  const prev: BuiltContext | null = ctx.compare
    ? { ...ctx, range: ctx.compare, compare: undefined }
    : null;

  const strip = async () => {
    const [current, previous] = await Promise.all([
      vitals(ctx),
      prev ? vitals(prev) : null,
    ]);
    return { current, previous };
  };

  const byDevice = async (): Promise<Record<string, Point[]>> => {
    const rows = await vitalsTimeseries(ctx0, ctx0.granularity);
    const out: Record<string, Point[]> = {};
    for (const d of DEVICES) out[d] = [];
    for (const r of rows) {
      if (!(r.device in out)) continue;
      out[r.device].push({ t: r.bucket, v: r.lcp ?? 0 });
    }
    return out;
  };

  const pages = async (): Promise<VitalPage[]> => {
    const rows = await vitalsBreakdown(ctx, "path", PAGE_ROWS);
    return [...rows].sort((a, b) => (b.lcp ?? -1) - (a.lcp ?? -1));
  };

  const selected = async (): Promise<SelectedPage | null> => {
    const path = state.sel;
    if (!path) return null;
    const scoped: BuiltContext = {
      ...ctx,
      filters: [
        ...ctx.filters,
        { dimension: "path", op: "is", values: [path] },
      ],
    };
    const [lcpTargets, inpTargets, countries] = await Promise.all([
      vitalsTargets(scoped, "lcp_target", TARGETS),
      vitalsTargets(scoped, "inp_target", TARGETS),
      vitalsBreakdown(scoped, "country", 30),
    ]);
    return {
      path,
      lcpTargets,
      inpTargets,
      countries: [...countries]
        .filter((c) => c.lcp !== null)
        .sort((a, b) => (b.lcp ?? 0) - (a.lcp ?? 0))
        .slice(0, SLOW_COUNTRIES),
    };
  };

  const distribution = async () => {
    const edges = Array.from(
      { length: LCP_MAX_MS / LCP_BIN_MS + 1 },
      (_, i) => i * LCP_BIN_MS
    );
    const bins = await histogram(ctx, "lcp", edges);
    return { bins, samples: bins.reduce((a, b) => a + b.count, 0) };
  };

  return {
    compare: prev !== null,
    kpi,
    device,
    granularity: ctx0.granularity,
    timezone: ctx0.timezone,
    sel: state.sel,
    strip: settle("performance.strip", strip()),
    byDevice: settle("performance.byDevice", byDevice()),
    pages: settle("performance.pages", pages()),
    selected: settle("performance.selected", selected()),
    distribution: settle("performance.distribution", distribution()),
  };
}
