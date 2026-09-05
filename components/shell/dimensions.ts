/**
 * How dimensions and their values read to a person (design §5, §6): the label,
 * whether a chip on it keeps whole sessions or matching events, and the value
 * as displayed (country codes become names with a flag, '' is Direct).
 */
import { countryFlag, countryNameFromCode } from "@/lib/geo/country-centroids";
import type { FilterOp } from "@/lib/query/filters";

export type DimensionInfo = {
  label: string;
  scope: "row" | "session";
  /** Shown in the filter builder. */
  group:
    | "Pages"
    | "Sources"
    | "Campaigns"
    | "Locations"
    | "Devices"
    | "Events"
    | "Sessions";
};

export const DIMENSIONS: Record<string, DimensionInfo> = {
  path: { label: "Page", scope: "row", group: "Pages" },
  hostname: { label: "Hostname", scope: "row", group: "Pages" },
  entry_path: { label: "Entry page", scope: "session", group: "Pages" },
  exit_path: { label: "Exit page", scope: "session", group: "Pages" },
  referrer: { label: "Referrer", scope: "row", group: "Sources" },
  source: { label: "Source", scope: "row", group: "Sources" },
  channel: { label: "Channel", scope: "row", group: "Sources" },
  entry_referrer: {
    label: "Entry referrer",
    scope: "session",
    group: "Sources",
  },
  entry_source: { label: "Entry source", scope: "session", group: "Sources" },
  entry_channel: { label: "Entry channel", scope: "session", group: "Sources" },
  utm_source: { label: "UTM source", scope: "row", group: "Campaigns" },
  utm_medium: { label: "UTM medium", scope: "row", group: "Campaigns" },
  utm_campaign: { label: "UTM campaign", scope: "row", group: "Campaigns" },
  utm_term: { label: "UTM term", scope: "row", group: "Campaigns" },
  utm_content: { label: "UTM content", scope: "row", group: "Campaigns" },
  entry_utm_source: {
    label: "Entry UTM source",
    scope: "session",
    group: "Campaigns",
  },
  entry_utm_medium: {
    label: "Entry UTM medium",
    scope: "session",
    group: "Campaigns",
  },
  entry_utm_campaign: {
    label: "Entry UTM campaign",
    scope: "session",
    group: "Campaigns",
  },
  entry_utm_term: {
    label: "Entry UTM term",
    scope: "session",
    group: "Campaigns",
  },
  entry_utm_content: {
    label: "Entry UTM content",
    scope: "session",
    group: "Campaigns",
  },
  country: { label: "Country", scope: "row", group: "Locations" },
  region: { label: "Region", scope: "row", group: "Locations" },
  city: { label: "City", scope: "row", group: "Locations" },
  language: { label: "Language", scope: "row", group: "Locations" },
  device: { label: "Device", scope: "row", group: "Devices" },
  browser: { label: "Browser", scope: "row", group: "Devices" },
  browser_major: { label: "Browser version", scope: "row", group: "Devices" },
  os: { label: "OS", scope: "row", group: "Devices" },
  os_version: { label: "OS version", scope: "row", group: "Devices" },
  screen_size: { label: "Screen size", scope: "row", group: "Devices" },
  event_name: { label: "Event", scope: "row", group: "Events" },
  bounced: { label: "Bounced", scope: "session", group: "Sessions" },
};

export function dimensionLabel(dimension: string): string {
  if (dimension.startsWith("prop:")) return `Property ${dimension.slice(5)}`;
  return DIMENSIONS[dimension]?.label ?? dimension;
}

export function dimensionScope(dimension: string): "row" | "session" {
  return DIMENSIONS[dimension]?.scope ?? "row";
}

export const OP_LABEL: Record<FilterOp, string> = {
  is: "is",
  is_not: "is not",
  contains: "contains",
};

/** The value as a person reads it. */
export function displayValue(dimension: string, value: string): string {
  if (dimension === "country") {
    const name = countryNameFromCode(value) ?? (value || "Unknown");
    const flag = countryFlag(name);
    return flag ? `${flag} ${name}` : name;
  }
  if (dimension === "bounced") return value === "true" ? "Yes" : "No";
  if (dimension === "device" && value)
    return value[0].toUpperCase() + value.slice(1);
  if (
    (dimension === "referrer" ||
      dimension === "source" ||
      dimension === "entry_referrer" ||
      dimension === "entry_source") &&
    !value
  )
    return "Direct";
  if (!value) return "Unknown";
  return value;
}

/** "Country is Canada" or "Entry channel is Organic Search, Social". */
export function filterSentence(
  dimension: string,
  op: FilterOp,
  values: string[]
): string {
  return `${dimensionLabel(dimension)} ${OP_LABEL[op]} ${values.map((v) => displayValue(dimension, v)).join(", ")}`;
}
