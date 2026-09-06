"use client";

import { fmtAgo, fmtDuration, fmtInt } from "@/lib/format";
import type { SessionSummary } from "@/lib/query/primitives";
import { displayValue } from "./dimensions";
import { openSession } from "./session-drawer";
import { useViewState } from "./view-state";

/**
 * A list of sessions (docs/design/visitor-journeys.md §3): when it started,
 * who in the aggregate sense, entry to exit, how much, and the Session
 * button that opens the drawer. Used by the selected goal and the selected
 * page; the drawer's "Also today" uses the row on its own.
 */
export function SessionRow({
  s,
  action,
  absolute = false,
}: {
  s: SessionSummary;
  /** The right-hand control; the caller decides what opening means. */
  action: React.ReactNode;
  /** Clock time instead of "4 min ago", for a list within one day. */
  absolute?: boolean;
}) {
  const when = absolute
    ? new Date(s.started).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      })
    : fmtAgo(new Date(s.started));
  const path =
    s.exit_path && s.exit_path !== s.entry_path
      ? `${s.entry_path} → ${s.exit_path}`
      : s.entry_path;
  return (
    <li className="grid grid-cols-[88px_minmax(0,1fr)_auto_auto] items-baseline gap-3 border-b border-rule py-[7px] text-[12.5px]">
      <span suppressHydrationWarning className="text-mute tabular">
        {when}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-ink">
          {displayValue("country", s.country)} ·{" "}
          {displayValue("device", s.device)}
        </span>
        <span className="block truncate text-[12px] text-mute">{path}</span>
      </span>
      <span className="whitespace-nowrap text-[12px] text-ink-2 tabular">
        {fmtInt(s.pageviews)} {s.pageviews === 1 ? "page" : "pages"} ·{" "}
        {fmtDuration(s.duration_ms)}
      </span>
      {action}
    </li>
  );
}

export function SessionList({
  sessions,
  emptyText,
}: {
  sessions: SessionSummary[];
  emptyText: string;
}) {
  const { state, update } = useViewState();
  if (!sessions.length)
    return <p className="text-[12.5px] text-mute">{emptyText}</p>;
  return (
    <ol className="flex flex-col">
      {sessions.map((s) => (
        <SessionRow
          key={`${s.visitor_id}:${s.session_id}`}
          s={s}
          action={
            <button
              type="button"
              onClick={() =>
                openSession(update, state, {
                  visitorId: s.visitor_id,
                  sessionId: s.session_id,
                })
              }
              className="text-[12px] font-medium text-teal-ink hover:underline"
            >
              Session
            </button>
          }
        />
      ))}
    </ol>
  );
}
