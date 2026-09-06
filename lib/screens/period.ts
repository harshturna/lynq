import type { ViewState } from "@/lib/url-state";

/** The range as a phrase that follows a total: "104 hours of attention this month". */
export function periodPhrase(range: ViewState["range"]): string {
  if (typeof range !== "string") return "in this range";
  const phrases: Record<string, string> = {
    last_24h: "in the last 24 hours",
    today: "today",
    yesterday: "yesterday",
    last_7d: "in the last 7 days",
    last_30d: "in the last 30 days",
    last_90d: "in the last 90 days",
    this_week: "this week",
    this_month: "this month",
    last_12mo: "in the last 12 months",
  };
  return phrases[range] ?? "in this range";
}
