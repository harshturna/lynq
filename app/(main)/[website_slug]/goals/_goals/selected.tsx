"use client";

import { LineChart } from "@/components/charts/charts";
import { DotPlot } from "@/components/charts/shapes";
import { DeltaBadge } from "@/components/shell/badge";
import { KpiStrip, type KpiTile } from "@/components/shell/kpi-strip";
import { Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import { useViewState } from "@/components/shell/view-state";
import { Funnel } from "@/components/shell/views";
import { fmtDuration, fmtInt, fmtPct, fmtRatio } from "@/lib/format";
import type { Granularity } from "@/lib/query/ranges";
import type { SelectedGoal } from "@/lib/screens/goals";
import type { Section as Settled } from "@/lib/screens/settle";
import { withParam } from "@/lib/url-state";

const GRAIN: Record<Granularity, string> = {
  hour: "per hour",
  day: "per day",
  week: "per week",
  month: "per month",
};

/** The selected goal (design §8.8): four tiles, funnel, conversion by channel, trend. */
export function SelectedGoalPanel({
  compare,
  granularity,
  timezone,
  selected,
}: {
  compare: boolean;
  granularity: Granularity;
  timezone: string;
  selected: Settled<SelectedGoal | null>;
}) {
  const { state, update } = useViewState();
  if (!selected.ok) return <SectionError title="Selected goal" strong />;
  const s = selected.data;
  if (!s) return null;
  const { goal, stats, previous } = s;
  const tiles: KpiTile[] = [
    {
      key: "completions",
      label: "Completions",
      value: fmtInt(stats.completions),
      delta:
        compare && previous ? (
          <DeltaBadge
            current={stats.completions}
            previous={previous.completions}
          />
        ) : undefined,
      note:
        compare && previous ? `vs ${fmtInt(previous.completions)}` : undefined,
    },
    {
      key: "conversion",
      label: "Conversion",
      value: fmtRatio(stats.converting_sessions, stats.sessions),
      delta:
        compare && previous?.sessions && stats.sessions ? (
          <DeltaBadge
            current={stats.conversion}
            previous={previous.conversion}
            points
          />
        ) : undefined,
      note:
        compare && previous?.sessions
          ? `vs ${fmtPct(previous.conversion, 1)}`
          : undefined,
    },
    {
      key: "time",
      label: "Time to convert",
      value:
        stats.median_seconds === null
          ? "—"
          : fmtDuration(stats.median_seconds * 1000),
      note:
        stats.median_seconds === null
          ? "no completions yet"
          : "median, from session start",
    },
    {
      key: "target",
      label: "Target",
      value: goal.target ? fmtRatio(stats.completions, goal.target, 0) : "—",
      note: goal.target
        ? `of ${fmtInt(goal.target)} per month`
        : "no target set",
    },
  ];
  const siteConversion = stats.sessions ? stats.conversion : 0;
  return (
    <div className="flex flex-col gap-7">
      <Section
        title={goal.name}
        qualifier="selected"
        right={
          <button
            type="button"
            onClick={() =>
              update(withParam(state, "sel", undefined), { replace: true })
            }
            className="hover:text-ink"
          >
            Clear
          </button>
        }
        strong
      >
        <KpiStrip tiles={tiles} label="Goal" />
      </Section>
      <div className="grid gap-8 min-[1000px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Section title="Funnel" qualifier="sessions" strong>
          <Funnel title={`${goal.name} funnel`} steps={s.funnel} />
        </Section>
        <Section
          title="Conversion by channel"
          qualifier="against the site average"
          strong
        >
          {s.channels.length ? (
            <DotPlot
              title={`Conversion to ${goal.name} by channel`}
              rows={s.channels}
              reference={siteConversion}
              referenceLabel="site average"
              format={(v) => fmtPct(v, 1)}
            />
          ) : (
            <p className="text-[12.5px] text-mute">
              No sessions in this period.
            </p>
          )}
        </Section>
      </div>
      <Section title="Completions" qualifier={GRAIN[granularity]} strong>
        <LineChart
          title={`${goal.name} completions ${GRAIN[granularity]}`}
          series={[
            {
              name: "Completions",
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
    </div>
  );
}
