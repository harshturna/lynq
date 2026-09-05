import type { Granularity } from "@/lib/query/ranges";
import type { VitalsSummary } from "@/lib/query/vitals";

/**
 * What the site dashboard receives from getDashboard(): aggregates only,
 * JSON-safe, computed by lib/query. No raw rows ever reach the client.
 */
export type BreakdownKey =
  | "path"
  | "referrer"
  | "source"
  | "device"
  | "browser"
  | "os"
  | "country";

export const BREAKDOWN_KEYS: BreakdownKey[] = [
  "path",
  "referrer",
  "source",
  "device",
  "browser",
  "os",
  "country",
];

export type Row = { value: string; metric: number };
export type Breakdown = { rows: Row[]; total: number };

export type Point = { t: string; v: number };

export type SummaryNumbers = {
  pageviews: number;
  visitors: number;
  custom_events: number;
  sessions: number;
  bounce_rate: number;
  engaged_time: number;
  pages_per_session: number;
  time_on_site: number;
};

export type DashboardEvent = {
  id: string;
  ts: string;
  name: string;
  props: Record<string, string>;
  path: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  os: string;
};

/** A click-to-filter chip: one value on one breakdown dimension. */
export type UiFilter = { dimension: BreakdownKey; value: string };

export type DashboardData = {
  timeFrame: DatePickerValues;
  granularity: Granularity;
  range: { from: string; to: string };
  summary: { current: SummaryNumbers; compare: SummaryNumbers | null };
  series: { pageviews: Point[]; sessions: Point[] };
  breakdowns: Record<BreakdownKey, Breakdown>;
  vitals: VitalsSummary;
  events: DashboardEvent[];
};
