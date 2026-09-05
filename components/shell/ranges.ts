/**
 * Range labels and stepping for the picker (design §6). Dates are YYYY-MM-DD
 * strings in the site timezone; "today" is computed there with date-fns-tz so
 * the calendar never drifts a day for a user in another zone.
 */
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { Range } from "@/lib/query/ranges";

export const PRESETS: { value: Exclude<Range, object>; label: string }[] = [
  { value: "last_24h", label: "Last 24 hours" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last_7d", label: "Last 7 days" },
  { value: "last_30d", label: "Last 30 days" },
  { value: "last_90d", label: "Last 90 days" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "last_12mo", label: "Last 12 months" },
];

export function todayIn(timezone: string, now = new Date()): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

export function rangeLabel(range: Range): string {
  if (typeof range === "string")
    return PRESETS.find((p) => p.value === range)?.label ?? range;
  const sameYear = range.from.slice(0, 4) === range.to.slice(0, 4);
  return `${formatDate(range.from, !sameYear)} – ${formatDate(range.to, true)}`;
}

export function formatDate(iso: string, withYear = false): string {
  return format(parseISO(iso), withYear ? "MMM d, yyyy" : "MMM d");
}

/** The inclusive dates a preset covers, for stepping and for the calendar's initial view. */
export function presetDates(
  range: Range,
  today: string
): { from: string; to: string } {
  if (typeof range !== "string") return range;
  const t = parseISO(today);
  const d = (x: Date) => format(x, "yyyy-MM-dd");
  switch (range) {
    case "today":
    case "last_24h":
      return { from: today, to: today };
    case "yesterday":
      return { from: d(addDays(t, -1)), to: d(addDays(t, -1)) };
    case "last_7d":
      return { from: d(addDays(t, -6)), to: today };
    case "last_30d":
      return { from: d(addDays(t, -29)), to: today };
    case "last_90d":
      return { from: d(addDays(t, -89)), to: today };
    case "last_12mo":
      return { from: d(addDays(t, -364)), to: today };
    case "this_week":
      return { from: d(startOfWeek(t, { weekStartsOn: 1 })), to: today };
    case "this_month":
      return { from: d(startOfMonth(t)), to: today };
  }
}

/** The same length of days, one step earlier or later; never past today. */
export function stepRange(
  range: Range,
  direction: -1 | 1,
  today: string
): Range {
  const { from, to } = presetDates(range, today);
  const days = differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
  const shift = direction * days;
  const nextFrom = addDays(parseISO(from), shift);
  let nextTo = addDays(parseISO(to), shift);
  if (nextTo > parseISO(today)) nextTo = parseISO(today);
  if (nextFrom > nextTo) return range;
  return {
    from: format(nextFrom, "yyyy-MM-dd"),
    to: format(nextTo, "yyyy-MM-dd"),
  };
}
