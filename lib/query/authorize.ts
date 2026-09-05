import "server-only";
import { sql } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/user/server";
import type { Filter } from "./filters";
import type { QueryContext } from "./primitives";
import {
  type CompareMode,
  compareRange,
  type Range,
  resolveRange,
} from "./ranges";

/**
 * The authorization seam (design §9.4). A QueryContext exists only through
 * here. In Phase 0 the one principal is the signed-in Supabase user, checked
 * the same way the server actions check ownership: a live websites row with
 * this url and the session user's id. API keys, share tokens and team
 * membership become further branches later; lib/query does not change.
 */
export type Principal = { kind: "session"; userId: string };

export type Site = { siteId: number; timezone: string };

export async function authorize(
  principal: Principal,
  site: { url: string }
): Promise<Site | null> {
  if (principal.kind !== "session") return null;
  const [supabase, user] = await Promise.all([createClient(), getUser()]);
  if (!user?.id || user.id !== principal.userId) return null;
  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("url", site.url)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!website) return null;
  const siteId = Number(website.id);
  const [settings] = await sql<{ timezone: string }[]>`
    select timezone from analytics.site_settings where site_id = ${siteId}`;
  return { siteId, timezone: settings?.timezone ?? "UTC" };
}

export type ContextOptions = {
  range: Range;
  compare?: CompareMode;
  filters?: Filter[];
  includeSuspect?: boolean;
  now?: Date;
};

export type BuiltContext = QueryContext & {
  granularity: ReturnType<typeof resolveRange>["granularity"];
};

/** Builds the context a primitive needs from an authorized site and the caller's choices. */
export function buildContext(site: Site, opts: ContextOptions): BuiltContext {
  const resolved = resolveRange(opts.range, site.timezone, opts.now);
  return {
    siteId: site.siteId,
    timezone: site.timezone,
    range: { from: resolved.from, toExclusive: resolved.toExclusive },
    compare: opts.compare
      ? compareRange(resolved, opts.compare, site.timezone)
      : undefined,
    filters: opts.filters ?? [],
    includeSuspect: opts.includeSuspect ?? false,
    granularity: resolved.granularity,
  };
}
