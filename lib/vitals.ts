import type { PillStatus } from "@/components/shell/badge";

/** Web Vitals thresholds (good / needs work / poor), p75 values in ms except CLS. */
export const VITAL_THRESHOLDS: Record<
  "lcp" | "inp" | "cls" | "fcp" | "ttfb",
  { good: number; poor: number; unit: "ms" | "" }
> = {
  lcp: { good: 2500, poor: 4000, unit: "ms" },
  inp: { good: 200, poor: 500, unit: "ms" },
  cls: { good: 0.1, poor: 0.25, unit: "" },
  fcp: { good: 1800, poor: 3000, unit: "ms" },
  ttfb: { good: 800, poor: 1800, unit: "ms" },
};

export const VITAL_LABELS = {
  lcp: "LCP",
  inp: "INP",
  cls: "CLS",
  fcp: "FCP",
  ttfb: "TTFB",
} as const;

export function vitalStatus(
  vital: keyof typeof VITAL_THRESHOLDS,
  value: number | null
): PillStatus {
  if (value === null) return "none";
  const t = VITAL_THRESHOLDS[vital];
  return value <= t.good ? "good" : value <= t.poor ? "warn" : "poor";
}

export function fmtVital(
  vital: keyof typeof VITAL_THRESHOLDS,
  value: number | null
): string {
  if (value === null) return "—";
  if (vital === "cls") return value.toFixed(2);
  return value >= 1000
    ? `${(value / 1000).toFixed(1)}s`
    : `${Math.round(value)}ms`;
}

export const STATUS_TEXT: Record<PillStatus, string> = {
  good: "Good",
  warn: "Needs work",
  poor: "Poor",
  none: "No data",
};
