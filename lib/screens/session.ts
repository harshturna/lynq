"use server";

import { buildContext } from "@/lib/query/authorize";
import { rows } from "@/lib/query/run";
import { resolveSite } from "./site";

/**
 * The session timeline behind the drawer (design §4, §6): the session's
 * pageviews and events in order, with engaged time per page folded in from
 * the engagement rows that follow each pageview.
 */
export type SessionStep =
  | {
      kind: "pageview";
      ts: string;
      path: string;
      title: string;
      engagedMs: number;
      scrollDepth: number;
    }
  | {
      kind: "custom";
      ts: string;
      name: string;
      path: string;
      props: Record<string, string>;
    };

export type SessionTimeline = {
  visitorId: string;
  sessionId: string;
  started: string | null;
  meta: {
    country: string;
    city: string;
    device: string;
    browser: string;
    os: string;
    source: string;
    channel: string;
    referrer: string;
  };
  steps: SessionStep[];
};

const ID = /^-?\d{1,20}$/;

export async function sessionTimeline(
  slug: string,
  visitorId: string,
  sessionId: string
): Promise<SessionTimeline | null> {
  if (!ID.test(visitorId) || !ID.test(sessionId)) return null;
  const { site } = await resolveSite(slug);
  const ctx = buildContext(site, { range: "last_12mo" });
  const list = await rows<{
    ts: Date;
    event: string;
    name: string;
    path: string;
    title: string;
    props: Record<string, string>;
    engaged_ms: number;
    scroll_depth: number;
    referrer: string;
    source: string;
    channel: string;
    country: string;
    city: string;
    device: string;
    browser: string;
    os: string;
  }>(ctx, "session", {
    visitorId: BigInt(visitorId),
    sessionId: BigInt(sessionId),
    limit: 500,
  });
  if (!list.length) return null;
  const first = list[0];
  const entry = list.find((r) => r.event === "pageview") ?? first;
  const steps: SessionStep[] = [];
  for (const r of list) {
    if (r.event === "pageview") {
      steps.push({
        kind: "pageview",
        ts: new Date(r.ts).toISOString(),
        path: r.path,
        title: r.title,
        engagedMs: 0,
        scrollDepth: 0,
      });
    } else if (r.event === "engagement") {
      const last = [...steps].reverse().find((s) => s.kind === "pageview");
      if (last && last.kind === "pageview") {
        last.engagedMs += Number(r.engaged_ms ?? 0);
        last.scrollDepth = Math.max(
          last.scrollDepth,
          Number(r.scroll_depth ?? 0)
        );
      }
    } else if (r.event === "custom") {
      steps.push({
        kind: "custom",
        ts: new Date(r.ts).toISOString(),
        name: r.name,
        path: r.path,
        props: r.props ?? {},
      });
    }
  }
  return {
    visitorId,
    sessionId,
    started: new Date(first.ts).toISOString(),
    meta: {
      country: first.country,
      city: first.city,
      device: first.device,
      browser: first.browser,
      os: first.os,
      source: entry.source,
      channel: entry.channel,
      referrer: entry.referrer,
    },
    steps,
  };
}
