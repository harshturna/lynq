"use client";

import { LineChart } from "@/components/charts/charts";
import { displayValue } from "@/components/shell/dimensions";
import { RowBar, Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import { openSession } from "@/components/shell/session-drawer";
import { useViewState } from "@/components/shell/view-state";
import { PathList } from "@/components/shell/views";
import { fmtAgo, fmtInt } from "@/lib/format";
import type { Granularity } from "@/lib/query/ranges";
import type { SelectedEvent } from "@/lib/screens/events";
import type { Section as Settled } from "@/lib/screens/settle";
import { withFilter, withParam } from "@/lib/url-state";

const GRAIN: Record<Granularity, string> = {
  hour: "per hour",
  day: "per day",
  week: "per week",
  month: "per month",
};

/** The selected event (design §8.7): trend, properties, recent occurrences, paths. */
export function SelectedEventPanel({
  compare,
  granularity,
  timezone,
  selected,
}: {
  compare: boolean;
  granularity: Granularity;
  timezone: string;
  selected: Settled<SelectedEvent | null>;
}) {
  const { state, update } = useViewState();
  if (!selected.ok) return <SectionError title="Selected event" strong />;
  const s = selected.data;
  if (!s) return null;
  return (
    <div className="flex flex-col gap-7">
      <Section
        title={s.name}
        qualifier="selected"
        right={
          <>
            <button
              type="button"
              onClick={() =>
                update(
                  withFilter(state, {
                    dimension: "event_name",
                    op: "is",
                    values: [s.name],
                  })
                )
              }
              className="text-teal-ink hover:underline"
            >
              Filter to this event
            </button>
            <button
              type="button"
              onClick={() =>
                update(withParam(state, "sel", undefined), { replace: true })
              }
              className="hover:text-ink"
            >
              Clear
            </button>
          </>
        }
        strong
      >
        <LineChart
          title={`${s.name} ${GRAIN[granularity]}`}
          series={[
            {
              name: s.name,
              points: s.trend.current,
              previous:
                compare && s.trend.previous ? s.trend.previous : undefined,
            },
          ]}
          granularity={granularity}
          timezone={timezone}
          height={180}
        />
      </Section>
      {s.properties.length > 0 && (
        <div className="grid gap-8 min-[1000px]:grid-cols-3">
          {s.properties.map((p) => {
            const max = Math.max(1, ...p.values.map((v) => v.count));
            return (
              <Section
                key={p.key}
                title={p.key}
                qualifier="property · top values"
                strong
              >
                <div className="flex flex-col gap-1">
                  {p.values.map((v) => (
                    <RowBar
                      key={v.value}
                      label={v.value}
                      value={fmtInt(v.count)}
                      share={(v.count / max) * 100}
                      onClick={() =>
                        update(
                          withFilter(state, {
                            dimension: `prop:${p.key}`,
                            op: "is",
                            values: [v.value],
                          })
                        )
                      }
                    />
                  ))}
                </div>
              </Section>
            );
          })}
        </div>
      )}
      <div className="grid gap-8 min-[1000px]:grid-cols-2">
        <Section title="Recent occurrences" qualifier="newest first" strong>
          {s.recent.length ? (
            <ol className="flex flex-col">
              {s.recent.map((o) => (
                <li
                  key={o.id}
                  className="grid grid-cols-[92px_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-rule py-[7px] text-[12.5px]"
                >
                  <span className="text-mute tabular">
                    {fmtAgo(new Date(o.ts))}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-ink">
                      {displayValue("country", o.country)} ·{" "}
                      {displayValue("device", o.device)} · {o.path}
                    </span>
                    {Object.keys(o.props).length > 0 && (
                      <span className="block truncate text-[12px] text-mute">
                        {Object.entries(o.props)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(" · ")}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      openSession(update, state, {
                        visitorId: o.visitorId,
                        sessionId: o.sessionId,
                      })
                    }
                    className="text-[12px] font-medium text-teal-ink hover:underline"
                  >
                    Session
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[12.5px] text-mute">
              No occurrences in this period.
            </p>
          )}
        </Section>
        <Section
          title="Paths to this event"
          qualifier="the last pages before it"
          strong
        >
          <PathList
            paths={s.paths.map((p) => ({
              key: p.steps.join(" › "),
              steps: p.steps,
              count: p.count,
            }))}
            endLabel={s.name}
          />
        </Section>
      </div>
    </div>
  );
}
