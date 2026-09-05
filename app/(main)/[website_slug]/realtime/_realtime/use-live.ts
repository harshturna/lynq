"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeRow } from "@/lib/query/realtime";
import type { LiveResult } from "@/lib/screens/live";

/**
 * The poll (design §8.2): every 10 s; Pause / Resume kept for the session;
 * back-off to 30 s then 60 s after five polls with no change; 60 s on
 * navigator.connection.saveData; paused while the tab is hidden; stopped
 * after 15 minutes without interaction; stopped for good on
 * "unauthenticated".
 */
export const BASE_MS = 10_000;
export const BACKOFF = [10_000, 30_000, 60_000] as const;
export const UNCHANGED_BEFORE_BACKOFF = 5;
export const IDLE_STOP_MS = 15 * 60_000;
const PAUSE_KEY = "lynq.live.paused";

export type LiveStatus =
  | "live"
  | "paused"
  | "hidden"
  | "idle"
  | "signed-out"
  | "error";

export function useLive(
  slug: string,
  initial: RealtimeRow | null,
  initialAt: string
) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<RealtimeRow | null>(initial);
  const [at, setAt] = useState(initialAt);
  const [status, setStatus] = useState<LiveStatus>("live");
  const [paused, setPaused] = useState(false);
  const unchanged = useRef(0);
  const lastKey = useRef(initial ? key(initial) : "");
  const lastInteraction = useRef(Date.now());
  const inFlight = useRef(false);
  const [tick, setTick] = useState(0);

  // a new server render (the window or the filters changed) brings fresh
  // data; adopt it even while paused
  useEffect(() => {
    setData(initial);
    setAt(initialAt);
    lastKey.current = initial ? key(initial) : "";
    unchanged.current = 0;
  }, [initial, initialAt]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(PAUSE_KEY) === "1") {
        setPaused(true);
        setStatus("paused");
      }
    } catch {
      /* storage may be unavailable */
    }
  }, []);

  const fetchOnce = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const qs = searchParams.toString();
      const res = await fetch(`/api/live/${slug}${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await res.json()) as LiveResult | { kind: "error" };
      if (body.kind === "unauthenticated") {
        setStatus("signed-out");
        return;
      }
      if (body.kind !== "ok") {
        setStatus("error");
        return;
      }
      const k = key(body.data);
      unchanged.current = k === lastKey.current ? unchanged.current + 1 : 0;
      lastKey.current = k;
      setData(body.data);
      setAt(body.at);
      setStatus((s) => (s === "error" ? "live" : s));
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, [slug, searchParams]);

  // the filters or the window changed: fetch now, reset the back-off
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    unchanged.current = 0;
    fetchOnce();
  }, [fetchOnce]);

  useEffect(() => {
    const mark = () => {
      lastInteraction.current = Date.now();
      setStatus((s) => (s === "idle" ? "live" : s));
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, mark, { passive: true });
    const vis = () =>
      setStatus((s) => {
        if (document.hidden) return s === "live" ? "hidden" : s;
        return s === "hidden" ? "live" : s;
      });
    document.addEventListener("visibilitychange", vis);
    return () => {
      for (const e of events) window.removeEventListener(e, mark);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `tick` re-arms the timer after each poll; the delay is read from refs on purpose
  useEffect(() => {
    if (status !== "live" || paused) return;
    const saveData =
      (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection?.saveData === true;
    const level = Math.min(
      BACKOFF.length - 1,
      Math.floor(unchanged.current / UNCHANGED_BEFORE_BACKOFF)
    );
    const delay = saveData ? BACKOFF[BACKOFF.length - 1] : BACKOFF[level];
    const t = setTimeout(async () => {
      if (Date.now() - lastInteraction.current > IDLE_STOP_MS) {
        setStatus("idle");
        return;
      }
      await fetchOnce();
      // re-arm through state so the next delay reflects the new back-off level
      setTick((n) => n + 1);
    }, delay);
    return () => clearTimeout(t);
  }, [status, paused, fetchOnce, tick]);

  const pause = () => {
    setPaused(true);
    setStatus("paused");
    try {
      sessionStorage.setItem(PAUSE_KEY, "1");
    } catch {
      /* ignore */
    }
  };
  const resume = () => {
    setPaused(false);
    lastInteraction.current = Date.now();
    unchanged.current = 0;
    setStatus("live");
    try {
      sessionStorage.removeItem(PAUSE_KEY);
    } catch {
      /* ignore */
    }
    fetchOnce();
  };

  return { data, at, status, paused, pause, resume };
}

function key(d: RealtimeRow): string {
  return `${d.visitors_now}|${d.pageviews}|${d.custom_events}|${d.events[0]?.ts ?? ""}|${d.events.length}`;
}
