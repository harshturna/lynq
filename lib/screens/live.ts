import "server-only";
import { getWebsite } from "@/lib/actions";
import { authorize, buildContext, type Site } from "@/lib/query/authorize";
import { REALTIME_WINDOW_MIN, type RealtimeRow } from "@/lib/query/realtime";
import { realtime } from "@/lib/query/run";
import { parseSearch, type SearchInput } from "@/lib/url-state";
import { getUser } from "@/lib/user/server";

/**
 * Realtime (design §8.2, §10): one function the page and the route both
 * call, and an authoriser for the route that never throws or redirects, so
 * the poll can tell "signed out" from "not yours" from "fine".
 */
export type LiveAuth =
  | { kind: "ok"; site: Site }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" };

export type LiveResult =
  | { kind: "ok"; data: RealtimeRow; at: string }
  | { kind: "unauthenticated" }
  | { kind: "forbidden" };

export async function authorizeLive(slug: string): Promise<LiveAuth> {
  const user = await getUser();
  if (!user?.id) return { kind: "unauthenticated" };
  const { data: website } = await getWebsite(slug, user.id);
  if (!website) return { kind: "forbidden" };
  const site = await authorize(
    { kind: "session", userId: user.id },
    { url: website.url }
  );
  return site ? { kind: "ok", site } : { kind: "forbidden" };
}

export function liveWindow(sp: SearchInput): number {
  const v = parseSearch(sp).view.realtime;
  return v === "hour" ? 60 : REALTIME_WINDOW_MIN;
}

export async function getLive(
  site: Site,
  sp: SearchInput,
  now = new Date()
): Promise<RealtimeRow> {
  const state = parseSearch(sp);
  const ctx = buildContext(site, { range: "last_24h", filters: state.filters });
  return realtime(ctx, now, liveWindow(sp));
}
