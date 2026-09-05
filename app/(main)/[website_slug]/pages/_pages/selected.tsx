"use client";

import Link from "next/link";
import { LineChart } from "@/components/charts/charts";
import { Pill } from "@/components/shell/badge";
import { displayValue } from "@/components/shell/dimensions";
import { RowBar, Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import { useViewState } from "@/components/shell/view-state";
import { FlowPanel } from "@/components/shell/views";
import { fmtDuration, fmtInt, fmtRatio } from "@/lib/format";
import type { Granularity } from "@/lib/query/ranges";
import type { Kpi } from "@/lib/screens/kpi";
import type { SelectedPage } from "@/lib/screens/pages";
import type { Section as Settled } from "@/lib/screens/settle";
import { withFilter, withParam } from "@/lib/url-state";
import { fmtVital, STATUS_TEXT, VITAL_LABELS, vitalStatus } from "@/lib/vitals";

/** Ranked rows per side of the flow panel; the query returns up to 60. */
const FLOW_ROWS = 8;

const GRAIN: Record<Granularity, string> = {
  hour: "per hour",
  day: "per day",
  week: "per week",
  month: "per month",
};

/** The selected page (design §8.3): flow, then vitals, goal and trend side by side. */
export function SelectedPagePanel({
  slug,
  kpi,
  compare,
  granularity,
  timezone,
  selected,
}: {
  slug: string;
  kpi: Kpi;
  compare: boolean;
  granularity: Granularity;
  timezone: string;
  selected: Settled<SelectedPage | null>;
}) {
  const { state, update } = useViewState();
  if (!selected.ok) return <SectionError title="Selected page" strong />;
  const s = selected.data;
  if (!s) return null;
  const from = s.flow.filter((r) => r.side === "from").slice(0, FLOW_ROWS);
  const to = s.flow.filter((r) => r.side === "to").slice(0, FLOW_ROWS);
  const occurrences = s.flow
    .filter((r) => r.side === "to")
    .reduce((a, r) => a + r.count, 0);
  const label = (r: (typeof from)[number]) =>
    r.kind === "exit"
      ? "Left the site"
      : r.kind === "referrer"
        ? `${displayValue("entry_referrer", r.value)} (entry)`
        : r.value;
  const pickPage = (r: (typeof from)[number]) => {
    if (r.kind === "page")
      update(withParam(state, "sel", r.value), { replace: true });
  };
  return (
    <div className="flex flex-col gap-7">
      <Section
        title={s.path}
        qualifier="selected · how visitors move through it"
        right={
          <>
            <button
              type="button"
              onClick={() =>
                update(
                  withFilter(state, {
                    dimension: "path",
                    op: "is",
                    values: [s.path],
                  })
                )
              }
              className="text-teal-ink hover:underline"
            >
              Filter to this page
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
        {occurrences ? (
          <FlowPanel
            node={{
              label: s.path,
              count: occurrences,
              qualifier: "views in sessions",
            }}
            from={from.map((r) => ({
              key: `${r.kind}:${r.value}`,
              label: label(r),
              count: r.count,
            }))}
            to={to.map((r) => ({
              key: `${r.kind}:${r.value}`,
              label: label(r),
              count: r.count,
            }))}
            onPick={(row) => {
              const r = [...from, ...to].find(
                (x) => `${x.kind}:${x.value}` === row.key
              );
              if (r) pickPage(r);
            }}
          />
        ) : (
          <p className="text-[12.5px] text-mute">
            No sessions touched this page in the range.
          </p>
        )}
      </Section>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-3">
        <Section title="Web Vitals" qualifier="p75 on this page" strong>
          {s.vitals.samples ? (
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
              {(["lcp", "inp", "cls"] as const).map((k) => {
                const st = vitalStatus(k, s.vitals[k]);
                return (
                  <li key={k} className="flex items-center gap-2">
                    <span>
                      {VITAL_LABELS[k]}{" "}
                      <b className="font-medium tabular">
                        {fmtVital(k, s.vitals[k])}
                      </b>
                    </span>
                    <Pill status={st}>{STATUS_TEXT[st]}</Pill>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-[12.5px] text-mute">
              No vitals samples on this page yet.
            </p>
          )}
        </Section>
        <Section title="Goals from this page" strong>
          {!kpi.goal ? (
            <p className="text-[12.5px] text-mute">
              No KPI goal yet.{" "}
              <Link
                href={`/${slug}/goals`}
                className="text-teal-ink underline underline-offset-2"
              >
                Set one
              </Link>
            </p>
          ) : s.goal ? (
            <div className="flex flex-col gap-1">
              <RowBar
                label="Sessions on this page"
                value={fmtInt(s.goal.sessions)}
                share={100}
              />
              <RowBar
                label={`Completed ${kpi.goal.name}`}
                value={fmtInt(s.goal.converting_sessions)}
                share={
                  s.goal.sessions
                    ? (s.goal.converting_sessions / s.goal.sessions) * 100
                    : 0
                }
              />
              <p className="mt-1 text-[12px] text-mute">
                {fmtRatio(s.goal.converting_sessions, s.goal.sessions)}{" "}
                conversion
                {s.goal.median_seconds !== null
                  ? ` · median ${fmtDuration(s.goal.median_seconds * 1000)} to convert`
                  : ""}
              </p>
            </div>
          ) : (
            <p className="text-[12.5px] text-mute">Couldn't load.</p>
          )}
        </Section>
        <Section
          title="Visitors to this page"
          qualifier={GRAIN[granularity]}
          strong
        >
          <LineChart
            title={`Visitors to ${s.path} ${GRAIN[granularity]}`}
            series={[
              {
                name: "Visitors",
                points: s.trend.current,
                previous:
                  compare && s.trend.previous ? s.trend.previous : undefined,
              },
            ]}
            granularity={granularity}
            timezone={timezone}
            height={140}
          />
        </Section>
      </div>
    </div>
  );
}
