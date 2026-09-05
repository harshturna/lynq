"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart } from "@/components/charts/charts";
import { DeltaBadge } from "@/components/shell/badge";
import { Control } from "@/components/shell/control";
import { displayValue } from "@/components/shell/dimensions";
import { LiveDot } from "@/components/shell/page-header";
import { RowBar, Section } from "@/components/shell/section";
import { openSession } from "@/components/shell/session-drawer";
import { useViewState } from "@/components/shell/view-state";
import { fmtAgo, fmtInt } from "@/lib/format";
import type { RealtimeRow } from "@/lib/query/realtime";
import { withFilter } from "@/lib/url-state";
import { useLive } from "./use-live";

const ANNOUNCE_EVERY_MS = 30_000;

/** The Realtime screen body (design §8.2). */
export function Live({
  slug,
  windowMin,
  initial,
  initialAt,
}: {
  slug: string;
  windowMin: number;
  initial: RealtimeRow | null;
  initialAt: string;
}) {
  const { data, at, status, paused, pause, resume } = useLive(
    slug,
    initial,
    initialAt
  );
  const { state, update } = useViewState();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const feed = useFeed(data?.events ?? []);
  const announced = useThrottledStatus(data?.visitors_now ?? 0);
  const windowLabel = windowMin === 60 ? "last hour" : "last 30 min";

  if (!data) {
    return (
      <p className="py-8 text-[13px] text-mute">
        Couldn't load live data.{" "}
        <button
          type="button"
          onClick={resume}
          className="text-teal-ink underline"
        >
          Retry
        </button>
      </p>
    );
  }
  const empty = data.visitors_now === 0 && data.pageviews === 0;
  const redirectTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;

  return (
    <div className="flex flex-col gap-7">
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        {status === "signed-out" ? (
          <p
            role="status"
            className="rounded-control bg-warn-soft px-3 py-2 text-warn"
          >
            Your session expired.{" "}
            <Link
              href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`}
              className="font-medium underline"
            >
              Sign in
            </Link>{" "}
            to keep live updates.
          </p>
        ) : status === "idle" ? (
          <>
            <span className="text-mute">
              Live updates stopped after 15 minutes.
            </span>
            <Control onClick={resume}>Resume live updates</Control>
          </>
        ) : (
          <>
            <LiveDot>
              {paused
                ? "Paused"
                : status === "hidden"
                  ? "Paused while the tab is hidden"
                  : status === "error"
                    ? "Retrying"
                    : "Updating every 10 seconds"}
            </LiveDot>
            <span className="text-mute">· updated {fmtAgo(new Date(at))}</span>
            <Control onClick={paused ? resume : pause} aria-pressed={paused}>
              {paused ? "Resume" : "Pause"}
            </Control>
          </>
        )}
        <span role="status" aria-live="polite" className="sr-only">
          {announced}
        </span>
      </div>

      {empty ? (
        <p className="rounded-card border border-dashed border-rule px-6 py-9 text-center text-[13px] text-mute">
          <span className="block text-[15px] font-medium text-ink">
            No one on the site right now
          </span>
          {data.last_at
            ? `The last event arrived ${fmtAgo(new Date(data.last_at))}.`
            : "No events have arrived yet."}
        </p>
      ) : null}

      <div className="grid border-t border-rule-strong min-[480px]:grid-cols-3">
        <Tile
          label="Visitors on the site now"
          value={fmtInt(data.visitors_now)}
          note="last 5 minutes"
        />
        <Tile
          label={`Pageviews, ${windowLabel}`}
          value={fmtInt(data.pageviews)}
          note={
            <span className="flex items-center gap-2">
              <DeltaBadge
                current={data.pageviews}
                previous={data.pageviews_prev}
              />
              vs the {windowLabel} before
            </span>
          }
        />
        <Tile
          label={`Events, ${windowLabel}`}
          value={fmtInt(data.custom_events)}
          note={
            data.event_names.length
              ? data.event_names.map((e) => `${e.count} ${e.value}`).join(" · ")
              : "none"
          }
        />
      </div>

      <Section title="Pageviews per minute" qualifier={windowLabel}>
        <BarChart
          title={`Pageviews per minute, ${windowLabel}`}
          name="Pageviews"
          bars={data.per_minute.map((m, i, all) => {
            const ago = all.length - 1 - i;
            return {
              label: ago % (windowMin === 60 ? 10 : 5) === 0 ? `-${ago}m` : "",
              title: ago === 0 ? "this minute" : `${ago} min ago`,
              value: m.pageviews,
            };
          })}
          accentLast
          height={130}
          animation={false}
        />
      </Section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-3">
        <ListPanel
          title="Pages now"
          unit="visitors"
          rows={data.pages.map((p) => ({
            key: p.value,
            label: p.value,
            count: p.visitors,
          }))}
          onPick={(k) =>
            update(
              withFilter(state, { dimension: "path", op: "is", values: [k] })
            )
          }
        />
        <ListPanel
          title="Sources"
          qualifier="entry"
          unit="sessions"
          rows={data.sources.map((s) => ({
            key: s.value,
            label: displayValue("entry_source", s.value),
            count: s.sessions,
          }))}
          onPick={(k) =>
            update(
              withFilter(state, {
                dimension: "entry_source",
                op: "is",
                values: [k],
              })
            )
          }
        />
        <ListPanel
          title="Countries"
          unit="visitors"
          rows={data.countries.map((c) => ({
            key: c.value,
            label: displayValue("country", c.value),
            count: c.visitors,
          }))}
          onPick={(k) =>
            update(
              withFilter(state, { dimension: "country", op: "is", values: [k] })
            )
          }
        />
      </div>

      <Section
        title="Activity"
        qualifier="newest first"
        right={
          feed.pending > 0 ? (
            <button
              type="button"
              onClick={feed.show}
              className="font-medium text-teal-ink hover:underline"
            >
              {feed.pending} new {feed.pending === 1 ? "event" : "events"}, show
            </button>
          ) : (
            <LiveDot>live</LiveDot>
          )
        }
      >
        {feed.rows.length ? (
          <ol className="flex flex-col">
            {feed.rows.map((e) => (
              <li
                key={`${e.ts}-${e.visitor_id}-${e.session_id}-${e.event}-${e.name}-${e.path}`}
                className="grid grid-cols-[64px_24px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule py-[7px] text-[12.5px]"
              >
                <span className="text-mute tabular">
                  {new Date(e.ts).toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
                <span aria-hidden>
                  {displayValue("country", e.country).split(" ")[0]}
                </span>
                <span
                  className={
                    e.event === "custom"
                      ? "truncate font-medium text-teal-ink"
                      : "truncate text-ink"
                  }
                >
                  {e.event === "custom" ? e.name : e.path}
                  {e.event === "custom" && (
                    <span className="ml-2 font-normal text-mute">
                      on {e.path}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    openSession(update, state, {
                      visitorId: e.visitor_id,
                      sessionId: e.session_id,
                    })
                  }
                  className="text-[12px] text-teal-ink hover:underline"
                >
                  Session
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[12.5px] text-mute">
            Nothing in the {windowLabel}.
          </p>
        )}
      </Section>
    </div>
  );
}

function Tile({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-[6px] border-b border-r border-rule py-4 pr-4 last:border-r-0 min-[480px]:mr-4 min-[480px]:last:mr-0">
      <span className="text-[12px] text-mute">{label}</span>
      <span className="text-[30px] font-medium leading-none tracking-[-0.02em] tabular">
        {value}
      </span>
      <span className="text-[12.5px] text-mute">{note}</span>
    </div>
  );
}

function ListPanel({
  title,
  qualifier,
  unit,
  rows,
  onPick,
}: {
  title: string;
  qualifier?: string;
  unit: string;
  rows: { key: string; label: string; count: number }[];
  onPick: (key: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Section title={title} qualifier={qualifier ?? unit} strong>
      {rows.length ? (
        <div className="flex flex-col gap-1">
          {rows.map((r) => (
            <RowBar
              key={r.key}
              label={r.label}
              value={fmtInt(r.count)}
              share={(r.count / max) * 100}
              onClick={() => onPick(r.key)}
            />
          ))}
        </div>
      ) : (
        <p className="text-[12.5px] text-mute">Nothing yet.</p>
      )}
    </Section>
  );
}

/** New rows wait behind a button (design §8.2): the feed is not a live region. */
function useFeed(latest: RealtimeRow["events"]) {
  const [shown, setShown] = useState(latest);
  const latestRef = useRef(latest);
  latestRef.current = latest;
  const shownKeys = useMemo(() => new Set(shown.map(rowKey)), [shown]);
  const pending = latest.filter((e) => !shownKeys.has(rowKey(e))).length;
  // a shorter list (filters changed) or an empty first paint replaces the feed outright
  useEffect(() => {
    if (shown.length === 0 || latest.length < shown.length) setShown(latest);
  }, [latest, shown.length]);
  return { rows: shown, pending, show: () => setShown(latestRef.current) };
}

function rowKey(e: RealtimeRow["events"][number]) {
  return `${e.ts}|${e.visitor_id}|${e.session_id}|${e.event}|${e.name}|${e.path}`;
}

/** The visitors-now number, announced at most once per 30 s (design §8.2). */
function useThrottledStatus(visitorsNow: number) {
  const [text, setText] = useState("");
  const last = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - last.current < ANNOUNCE_EVERY_MS) return;
    last.current = now;
    setText(
      `${visitorsNow} ${visitorsNow === 1 ? "visitor" : "visitors"} on the site now`
    );
  }, [visitorsNow]);
  return text;
}
