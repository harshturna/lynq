/**
 * The dashboard's view state, read from and written to the URL (design §5).
 * Every range, comparison, filter chip, table view and sort, selection and
 * open drawer lives in the query string, so reload, back/forward and sharing
 * all work and the server renders the right thing on first load.
 *
 * parseSearch never throws: unknown or malformed params are ignored.
 * toSearch writes keys in a fixed order so Share copies a stable URL and the
 * router dedupes on it.
 */
import {
  type Filter,
  type FilterOp,
  isRowDimension,
  isSessionDimension,
  propKey,
} from "@/lib/query/filters";
import type { CompareMode, Range } from "@/lib/query/ranges";

export type Compare = CompareMode | "none";
export type DeviceView = "all" | "desktop" | "mobile";
export type SortDir = "asc" | "desc";

export type ViewState = {
  range: Range;
  compare: Compare;
  filters: Filter[];
  /** Segmented caption per table region, e.g. { pages: "exit" }. */
  view: Record<string, string>;
  /** Sort per table region. */
  sort: Record<string, { col: string; dir: SortDir }>;
  /** The selected entity on screens with a detail panel. */
  sel?: string;
  /** The session drawer, open on any screen. */
  session?: { visitorId: string; sessionId: string };
  device?: DeviceView;
  /** The checked KPI tile on the Overview, which drives the lead chart. */
  metric?: OverviewMetric;
};

export const OVERVIEW_METRICS = [
  "visitors",
  "sessions",
  "pageviews",
  "bounce_rate",
  "engaged_time",
  "kpi",
] as const;
export type OverviewMetric = (typeof OVERVIEW_METRICS)[number];
export const DEFAULT_METRIC: OverviewMetric = "visitors";

export type SearchInput = Record<string, string | string[] | undefined>;

export const DEFAULT_RANGE: Range = "last_30d";
export const DEFAULT_COMPARE: Compare = "previous_period";

const PRESET_RANGES = new Set<string>([
  "last_24h",
  "last_7d",
  "last_30d",
  "last_90d",
  "last_12mo",
  "today",
  "yesterday",
  "this_week",
  "this_month",
]);
const COMPARES = new Set<string>(["previous_period", "previous_year", "none"]);
const OPS = new Set<string>(["is", "is_not", "contains"]);
const DEVICES = new Set<string>(["all", "desktop", "mobile"]);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const REGION = /^[a-z][a-z0-9_-]{0,31}$/;
const COLUMN = /^[a-z][a-z0-9_]{0,31}$/;
const ID = /^-?\d{1,20}$/;
const MAX_FILTERS = 20;
const MAX_VALUES = 20;
const MAX_VALUE_LENGTH = 512;

export function defaultState(): ViewState {
  return {
    range: DEFAULT_RANGE,
    compare: DEFAULT_COMPARE,
    filters: [],
    view: {},
    sort: {},
  };
}

/** A date string that exists on the calendar. */
function isCalendarDate(s: string): boolean {
  if (!DATE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function isKnownDimension(d: string): boolean {
  return isRowDimension(d) || isSessionDimension(d) || propKey(d) !== null;
}

function first(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
function all(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? v : [v];
}

function parseRange(raw: string | undefined): Range {
  if (!raw) return DEFAULT_RANGE;
  if (PRESET_RANGES.has(raw)) return raw as Range;
  const parts = raw.split(",");
  if (
    parts.length === 2 &&
    isCalendarDate(parts[0]) &&
    isCalendarDate(parts[1]) &&
    parts[0] <= parts[1]
  ) {
    return { from: parts[0], to: parts[1] };
  }
  return DEFAULT_RANGE;
}

/** `dimension:op:v1|v2`; `|` and `:` inside a value arrive percent-encoded from toSearch. */
export function parseFilter(raw: string): Filter | null {
  // "prop:<key>" dimensions carry a colon of their own, so their name spans two segments.
  const a = raw.startsWith("prop:") ? raw.indexOf(":", 5) : raw.indexOf(":");
  const b = raw.indexOf(":", a + 1);
  if (a <= 0 || b <= a + 1 || b === raw.length - 1) return null;
  const dimension = raw.slice(0, a);
  const op = raw.slice(a + 1, b);
  if (!OPS.has(op) || !isKnownDimension(dimension)) return null;
  const values = raw
    .slice(b + 1)
    .split("|")
    .map(decodeValue)
    .filter((v): v is string => v !== null && v.length <= MAX_VALUE_LENGTH)
    .slice(0, MAX_VALUES);
  const unique = [...new Set(values)];
  if (!unique.length) return null;
  return { dimension, op: op as FilterOp, values: unique };
}

function decodeValue(v: string): string | null {
  try {
    return decodeURIComponent(v);
  } catch {
    return null;
  }
}
function encodeValue(v: string): string {
  return v.replace(/%/g, "%25").replace(/\|/g, "%7C").replace(/:/g, "%3A");
}

export function parseSearch(sp: SearchInput): ViewState {
  const state = defaultState();
  state.range = parseRange(first(sp.range));
  const compare = first(sp.compare);
  if (compare && COMPARES.has(compare)) state.compare = compare as Compare;

  const filters: Filter[] = [];
  const seen = new Set<string>();
  for (const raw of all(sp.f)) {
    const f = parseFilter(raw);
    if (!f) continue;
    const key = `${f.dimension}:${f.op}`;
    if (seen.has(key)) {
      // Same dimension and op twice: OR-merge the values.
      const existing = filters.find((x) => `${x.dimension}:${x.op}` === key);
      if (existing)
        existing.values = [...new Set([...existing.values, ...f.values])].slice(
          0,
          MAX_VALUES
        );
      continue;
    }
    seen.add(key);
    filters.push(f);
    if (filters.length >= MAX_FILTERS) break;
  }
  state.filters = filters;

  for (const [key, value] of Object.entries(sp)) {
    const v = first(value);
    if (!v) continue;
    if (key.startsWith("view.")) {
      const region = key.slice(5);
      if (REGION.test(region) && COLUMN.test(v)) state.view[region] = v;
    } else if (key.startsWith("sort.")) {
      const region = key.slice(5);
      const dir: SortDir = v.startsWith("-") ? "desc" : "asc";
      const col = v.startsWith("-") ? v.slice(1) : v;
      if (REGION.test(region) && COLUMN.test(col))
        state.sort[region] = { col, dir };
    }
  }

  const sel = first(sp.sel);
  if (sel && sel.length <= MAX_VALUE_LENGTH) state.sel = sel;
  const session = first(sp.session);
  if (session) {
    const [visitorId, sessionId, extra] = session.split(":");
    if (
      visitorId &&
      sessionId &&
      extra === undefined &&
      ID.test(visitorId) &&
      ID.test(sessionId)
    ) {
      state.session = { visitorId, sessionId };
    }
  }
  const device = first(sp.device);
  if (device && DEVICES.has(device)) state.device = device as DeviceView;
  const metric = first(sp.metric);
  if (
    metric &&
    metric !== DEFAULT_METRIC &&
    (OVERVIEW_METRICS as readonly string[]).includes(metric)
  )
    state.metric = metric as OverviewMetric;
  return state;
}

/** Stable key order: range, compare, f…, view.*, sort.*, sel, session, device, metric. */
export function toSearch(s: ViewState): URLSearchParams {
  const out = new URLSearchParams();
  if (s.range !== DEFAULT_RANGE) {
    out.set(
      "range",
      typeof s.range === "string" ? s.range : `${s.range.from},${s.range.to}`
    );
  }
  if (s.compare !== DEFAULT_COMPARE) out.set("compare", s.compare);
  for (const f of s.filters) {
    out.append(
      "f",
      `${f.dimension}:${f.op}:${f.values.map(encodeValue).join("|")}`
    );
  }
  for (const region of Object.keys(s.view).sort())
    out.set(`view.${region}`, s.view[region]);
  for (const region of Object.keys(s.sort).sort()) {
    const { col, dir } = s.sort[region];
    out.set(`sort.${region}`, dir === "desc" ? `-${col}` : col);
  }
  if (s.sel !== undefined) out.set("sel", s.sel);
  if (s.session)
    out.set("session", `${s.session.visitorId}:${s.session.sessionId}`);
  if (s.device && s.device !== "all") out.set("device", s.device);
  if (s.metric && s.metric !== DEFAULT_METRIC) out.set("metric", s.metric);
  return out;
}

/** `?range=…` or '' when everything is at its default. */
export function toQuery(s: ViewState): string {
  const q = toSearch(s).toString();
  return q ? `?${q}` : "";
}

const sameKey = (a: Filter, b: Filter) =>
  a.dimension === b.dimension && a.op === b.op;

/** Adds a filter; OR-merges into an existing filter on the same dimension and op. */
export function withFilter(s: ViewState, f: Filter): ViewState {
  const existing = s.filters.find((x) => sameKey(x, f));
  const filters = existing
    ? s.filters.map((x) =>
        x === existing
          ? { ...x, values: [...new Set([...x.values, ...f.values])] }
          : x
      )
    : [...s.filters, { ...f, values: [...new Set(f.values)] }];
  return { ...s, filters };
}

/** Removes one value (or the whole dimension when no value is given). */
export function withoutFilter(
  s: ViewState,
  dimension: string,
  value?: string
): ViewState {
  const filters = s.filters
    .map((f) => {
      if (f.dimension !== dimension) return f;
      if (value === undefined) return null;
      const values = f.values.filter((v) => v !== value);
      return values.length ? { ...f, values } : null;
    })
    .filter((f): f is Filter => f !== null);
  return { ...s, filters };
}

export function hasFilter(
  s: ViewState,
  dimension: string,
  value: string
): boolean {
  return s.filters.some(
    (f) =>
      f.dimension === dimension && f.op === "is" && f.values.includes(value)
  );
}

export function withParam<K extends keyof ViewState>(
  s: ViewState,
  key: K,
  value: ViewState[K]
): ViewState {
  const next = { ...s, [key]: value } as ViewState;
  if (value === undefined) delete next[key];
  return next;
}

export function withView(
  s: ViewState,
  region: string,
  view: string
): ViewState {
  return { ...s, view: { ...s.view, [region]: view } };
}

export function withSort(
  s: ViewState,
  region: string,
  col: string,
  dir: SortDir
): ViewState {
  return { ...s, sort: { ...s.sort, [region]: { col, dir } } };
}
