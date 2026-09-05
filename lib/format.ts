/** Number and unit formatting for the screens (design §6, §12). */
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** "48s", "1m 48s", "2h 03m". Milliseconds in. */
export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

export function fmtPct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/** A share or rate with its denominator: "—" when there is nothing to divide by (design §12). */
export function fmtRatio(
  numerator: number,
  denominator: number,
  digits = 1
): string {
  if (!denominator) return "—";
  return fmtPct((numerator / denominator) * 100, digits);
}

/** Revenue as the site reports it; the unit is the site's own. */
export function fmtRevenue(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** "just now", "2 min ago", "3 hours ago", "6 days ago". */
export function fmtAgo(date: Date, now = new Date()): string {
  const s = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "hour" : "hours"} ago`;
  const d = Math.floor(h / 24);
  return `${d} ${d === 1 ? "day" : "days"} ago`;
}
