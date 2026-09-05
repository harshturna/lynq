import type { PillStatus } from "@/components/shell/badge";

/** The status pill (design §8.12): receiving data, silent for N days, or nothing yet. */
export const SILENT_AFTER_DAYS = 7;

export function siteStatus(
  lastAt: Date | null,
  now = new Date()
): { tone: PillStatus; text: string } {
  if (!lastAt) return { tone: "none", text: "No data yet" };
  const days = Math.floor((now.getTime() - lastAt.getTime()) / 86_400_000);
  if (days >= SILENT_AFTER_DAYS)
    return { tone: "warn", text: `Nothing for ${days} days` };
  return { tone: "good", text: "Receiving data" };
}
