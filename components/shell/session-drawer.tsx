"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fmtDuration } from "@/lib/format";
import type { SessionTimeline } from "@/lib/screens/session";
import { type ViewState, withParam } from "@/lib/url-state";
import { Pill } from "./badge";
import { displayValue } from "./dimensions";
import { Drawer } from "./drawer";
import { SessionRow } from "./session-list";
import { Bone } from "./skeleton";
import { useViewState } from "./view-state";

/**
 * The session drawer (design §4, §6): addressed by `session=<visitor>:<session>`
 * on any screen. History rule: a row that opens it pushes the param; closing
 * calls back() when this page pushed that entry, else replaces the URL
 * without it, so Back never re-opens a drawer.
 */
let pushedHere = false;

export function openSession(
  update: (next: ViewState) => void,
  state: ViewState,
  ids: { visitorId: string; sessionId: string }
) {
  pushedHere = true;
  update(withParam(state, "session", ids));
}

export function SessionDrawer({
  load,
}: {
  load: (
    visitorId: string,
    sessionId: string
  ) => Promise<SessionTimeline | null>;
}) {
  const { state, update } = useViewState();
  const router = useRouter();
  const ids = state.session;
  const key = ids ? `${ids.visitorId}:${ids.sessionId}` : null;
  const [data, setData] = useState<{
    key: string;
    timeline: SessionTimeline | null;
  } | null>(null);
  useEffect(() => {
    if (!ids || !key) return;
    let live = true;
    load(ids.visitorId, ids.sessionId)
      .then((timeline) => live && setData({ key, timeline }))
      .catch(() => live && setData({ key, timeline: null }));
    return () => {
      live = false;
    };
  }, [ids, key, load]);
  const close = () => {
    if (pushedHere) {
      pushedHere = false;
      router.back();
    } else update(withParam(state, "session", undefined), { replace: true });
  };
  const loading = Boolean(key) && data?.key !== key;
  const t = data?.key === key ? data.timeline : null;
  return (
    <Drawer
      open={Boolean(ids)}
      onOpenChange={(o) => !o && close()}
      title="Session"
      description={
        t
          ? `${displayValue("country", t.meta.country)}${t.meta.city ? `, ${t.meta.city}` : ""} · ${displayValue("device", t.meta.device)} · ${t.meta.browser} on ${t.meta.os} · from ${displayValue("entry_source", t.meta.source)}`
          : ids
            ? `Visitor ${ids.visitorId}`
            : undefined
      }
    >
      {loading ? (
        <div className="flex flex-col gap-3">
          <Bone className="h-4 w-48" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-full" />
          <Bone className="h-4 w-2/3" />
        </div>
      ) : !t ? (
        <p className="text-[13px] text-mute">
          This session is not in the last twelve months, or is not yours to see.
        </p>
      ) : (
        <>
          <Timeline t={t} />
          <AlsoToday
            t={t}
            open={(ids) =>
              update(withParam(state, "session", ids), { replace: true })
            }
          />
        </>
      )}
    </Drawer>
  );
}

function Timeline({ t }: { t: SessionTimeline }) {
  const start = t.started ? new Date(t.started).getTime() : 0;
  const at = (iso: string) => {
    const s = Math.max(0, Math.round((new Date(iso).getTime() - start) / 1000));
    return s < 60
      ? `+${s}s`
      : `+${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
  };
  const total = t.steps.reduce(
    (a, s) => a + (s.kind === "pageview" ? s.engagedMs : 0),
    0
  );
  // two rows can share a timestamp; number the repeats so keys stay stable
  const seen = new Map<string, number>();
  const keyed = t.steps.map((s) => {
    const base = `${s.ts}-${s.kind === "pageview" ? s.path : s.name}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return { s, key: n === 1 ? base : `${base}#${n}` };
  });
  return (
    <div className="flex flex-col gap-4 text-[13px]">
      <p className="text-[12.5px] text-mute">
        Started{" "}
        {t.started
          ? new Date(t.started).toLocaleString("en-US", {
              dateStyle: "medium",
              timeStyle: "short",
            })
          : "—"}{" "}
        · {t.steps.filter((s) => s.kind === "pageview").length}{" "}
        {t.steps.filter((s) => s.kind === "pageview").length === 1
          ? "page"
          : "pages"}{" "}
        · {fmtDuration(total)} engaged
        {t.meta.referrer ? ` · referrer ${t.meta.referrer}` : ""}
      </p>
      <ol className="flex flex-col">
        {keyed.map(({ s, key }) => (
          <li
            key={key}
            className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-rule py-[8px]"
          >
            <span className="text-[12px] text-mute tabular">{at(s.ts)}</span>
            {s.kind === "pageview" ? (
              <>
                <span className="min-w-0">
                  <span className="block truncate text-ink">{s.path}</span>
                  {s.title && (
                    <span className="block truncate text-[12px] text-mute">
                      {s.title}
                    </span>
                  )}
                </span>
                <span className="text-[12px] text-ink-2 tabular">
                  {fmtDuration(s.engagedMs)}
                  {s.scrollDepth ? ` · ${s.scrollDepth}%` : ""}
                </span>
              </>
            ) : (
              <>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <Pill status="good">{s.name}</Pill>
                    <span className="truncate text-[12px] text-mute">
                      on {s.path}
                    </span>
                  </span>
                  {Object.keys(s.props).length > 0 && (
                    <span className="mt-1 block truncate text-[12px] text-ink-2">
                      {Object.entries(s.props)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </span>
                  )}
                </span>
                <span />
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * The same visitor's other sessions that UTC day (docs/design/visitor-journeys.md §3).
 * Choosing one replaces the URL rather than pushing it, so Back still closes
 * the drawer.
 */
function AlsoToday({
  t,
  open,
}: {
  t: SessionTimeline;
  open: (ids: { visitorId: string; sessionId: string }) => void;
}) {
  const day = t.started
    ? new Date(t.started).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
    : "that day";
  return (
    <section aria-labelledby="also-today" className="mt-6">
      <h3 id="also-today" className="text-[13px] font-medium text-ink">
        Also today
      </h3>
      <p className="mt-1 mb-2 text-[12px] text-mute">
        {t.others.length
          ? `This visitor's other ${t.others.length === 1 ? "session" : "sessions"} on ${day}, UTC.`
          : `No other session from this visitor on ${day}.`}{" "}
        An anonymous visitor is a new number tomorrow, so a day is the whole
        story.
      </p>
      {t.others.length > 0 && (
        <ol className="flex flex-col">
          {t.others.map((s) => (
            <SessionRow
              key={s.session_id}
              s={s}
              absolute
              action={
                <button
                  type="button"
                  onClick={() =>
                    open({ visitorId: s.visitor_id, sessionId: s.session_id })
                  }
                  className="text-[12px] font-medium text-teal-ink hover:underline"
                >
                  Open
                </button>
              }
            />
          ))}
        </ol>
      )}
    </section>
  );
}
