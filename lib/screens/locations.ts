import "server-only";
import type { BuiltContext } from "@/lib/query/authorize";
import type { BreakdownMultiRow, MetricSpec } from "@/lib/query/breakdown";
import { breakdownMulti, heatmap, summary } from "@/lib/query/run";
import type { ViewState } from "@/lib/url-state";
import type { Kpi } from "./kpi";
import { type Section, settle } from "./settle";

/**
 * The Locations screen (design §8.5): countries, then the selected country's
 * regions and cities, the country-by-hour heatmap in the site timezone, and
 * languages. Region and city come from the platform's geo headers and may be
 * absent, which the tables say.
 */
export const LOCATION_LIMIT = 200;
export const HEATMAP_ROWS = 10;

export type LocationTable = {
  dimension: string;
  rows: BreakdownMultiRow[];
  previous: Record<string, BreakdownMultiRow> | null;
  total: number;
  visitors: number;
};

export type LocationsScreen = {
  compare: boolean;
  kpi: Kpi;
  /** The selected country code, when drilling in. */
  country: string | undefined;
  countries: Promise<Section<LocationTable>>;
  regions: Promise<Section<LocationTable>>;
  cities: Promise<Section<LocationTable>>;
  languages: Promise<Section<LocationTable>>;
  heatmap: Promise<
    Section<{ rows: { value: string; hours: number[] }[]; sessions: number }>
  >;
};

export function getLocationsScreen(
  ctx: BuiltContext,
  state: ViewState,
  kpi: Kpi
): LocationsScreen {
  const prev: BuiltContext | null = ctx.compare
    ? { ...ctx, range: ctx.compare, compare: undefined }
    : null;
  const country =
    state.sel && /^[A-Z]{2}$/.test(state.sel) ? state.sel : undefined;
  const scoped: BuiltContext = country
    ? {
        ...ctx,
        filters: [
          ...ctx.filters,
          { dimension: "country", op: "is", values: [country] },
        ],
      }
    : ctx;
  const scopedPrev =
    prev && country
      ? { ...scoped, range: prev.range, compare: undefined }
      : prev;
  const sumP = summary(ctx);
  const metrics: MetricSpec[] = ["visitors", "pageviews", "bounce_rate"];
  if (kpi.goal) metrics.push({ kind: "goal_completions", goal: kpi.goal });

  const table = async (
    dimension: string,
    c: BuiltContext,
    p: BuiltContext | null,
    m: MetricSpec[] = metrics
  ): Promise<LocationTable> => {
    const [cur, before, sum] = await Promise.all([
      breakdownMulti(c, dimension, m, { limit: LOCATION_LIMIT }),
      p ? breakdownMulti(p, dimension, m, { limit: LOCATION_LIMIT }) : null,
      sumP,
    ]);
    return {
      dimension,
      rows: cur.rows,
      previous: before
        ? Object.fromEntries(before.rows.map((r) => [r.value, r]))
        : null,
      total: cur.total,
      visitors: sum.current.visitors,
    };
  };

  const heat = async () => {
    const [rows, sum] = await Promise.all([
      heatmap(ctx, "country", HEATMAP_ROWS),
      sumP,
    ]);
    return { rows, sessions: sum.current.sessions };
  };

  return {
    compare: prev !== null,
    kpi,
    country,
    countries: settle("locations.countries", table("country", ctx, prev)),
    regions: settle("locations.regions", table("region", scoped, scopedPrev)),
    cities: settle("locations.cities", table("city", scoped, scopedPrev)),
    languages: settle(
      "locations.languages",
      table("language", ctx, prev, ["visitors", "pageviews"])
    ),
    heatmap: settle("locations.heatmap", heat()),
  };
}
