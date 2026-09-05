/** Formatting shared by the option builders and the tables beside them. */
import { addDays, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { Granularity } from "@/lib/query/ranges";

export type Point = { t: string; v: number };

export const fmtNumber = (n: number) =>
  Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { maximumFractionDigits: 1 });

/** Axis label for a bucket start, by granularity, in the site timezone. */
export function bucketLabel(
  iso: string,
  granularity: Granularity,
  tz = "UTC"
): string {
  const d = parseISO(iso);
  switch (granularity) {
    case "hour":
      return formatInTimeZone(d, tz, "h a");
    case "week":
      return formatInTimeZone(d, tz, "MMM d");
    case "month":
      return formatInTimeZone(d, tz, "MMM yyyy");
    default:
      return formatInTimeZone(d, tz, "MMM d");
  }
}

/** Tooltip label for a bucket: the full date, or the week's span, in the site timezone. */
export function bucketTitle(
  iso: string,
  granularity: Granularity,
  tz = "UTC"
): string {
  const d = parseISO(iso);
  switch (granularity) {
    case "hour":
      return formatInTimeZone(d, tz, "MMM d, h:mm a");
    case "week":
      return `${formatInTimeZone(d, tz, "MMM d")} – ${formatInTimeZone(addDays(d, 6), tz, "MMM d, yyyy")}`;
    case "month":
      return formatInTimeZone(d, tz, "MMMM yyyy");
    default:
      return formatInTimeZone(d, tz, "EEE, MMM d, yyyy");
  }
}

export function pctChange(
  current: number,
  previous: number | null | undefined
): string | null {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return current > 0 ? "new" : null;
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.05) return "no change";
  return `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct).toFixed(1)}%`;
}

/** One sentence for the figure's description (design §7). */
export function describeSeries(
  name: string,
  points: Point[],
  granularity: Granularity,
  tz = "UTC"
): string {
  if (!points.length) return `${name}: no data in this range.`;
  const total = points.reduce((a, p) => a + p.v, 0);
  let min = points[0];
  let max = points[0];
  for (const p of points) {
    if (p.v < min.v) min = p;
    if (p.v > max.v) max = p;
  }
  const first = points[0].v;
  const last = points[points.length - 1].v;
  const direction = last > first ? "rising" : last < first ? "falling" : "flat";
  return `${name}: ${fmtNumber(total)} in total over ${points.length} ${granularity === "hour" ? "hours" : granularity === "day" ? "days" : granularity === "week" ? "weeks" : "months"}, ${direction}; highest ${fmtNumber(max.v)} on ${bucketTitle(max.t, granularity, tz)}, lowest ${fmtNumber(min.v)} on ${bucketTitle(min.t, granularity, tz)}.`;
}
