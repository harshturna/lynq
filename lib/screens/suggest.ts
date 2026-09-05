"use server";

import { buildContext } from "@/lib/query/authorize";
import { isSessionDimension, propKey } from "@/lib/query/filters";
import { breakdown } from "@/lib/query/run";
import { isKnownDimension } from "@/lib/url-state";
import { resolveSite } from "./site";

/** Values the filter builder offers for a dimension: the top 20 over the last 30 days. */
export async function suggestValues(
  slug: string,
  dimension: string
): Promise<string[]> {
  if (!isKnownDimension(dimension)) return [];
  const { site } = await resolveSite(slug);
  const ctx = buildContext(site, { range: "last_30d" });
  const metric = isSessionDimension(dimension)
    ? "sessions"
    : propKey(dimension) || dimension === "event_name"
      ? "custom_events"
      : "pageviews";
  try {
    const { rows } = await breakdown(ctx, dimension, metric, { limit: 20 });
    return rows.map((r) => r.value);
  } catch {
    return [];
  }
}
