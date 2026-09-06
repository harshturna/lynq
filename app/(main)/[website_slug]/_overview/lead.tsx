"use client";

import Link from "next/link";
import { LineChart } from "@/components/charts/charts";
import { DeltaBadge } from "@/components/shell/badge";
import { displayValue } from "@/components/shell/dimensions";
import { KpiStrip, type KpiTile } from "@/components/shell/kpi-strip";
import { NoteForm } from "@/components/shell/note-form";
import { NotesSlot } from "@/components/shell/notes-slot";
import { RowBar, Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import { useAnnounce, useViewState } from "@/components/shell/view-state";
import { SplitBar } from "@/components/shell/views";
import { VisitorTotal } from "@/components/shell/visitor-total";
import type { Point } from "@/lib/charts/format";
import { fmtDuration, fmtInt, fmtPct, fmtRatio } from "@/lib/format";
import type { Summary } from "@/lib/query/primitives";
import type { Granularity } from "@/lib/query/ranges";
import type { Kpi } from "@/lib/screens/kpi";
import type { DevicesData, GoalData, SeriesData } from "@/lib/screens/overview";
import type { Section as Settled } from "@/lib/screens/settle";
import {
  DEFAULT_METRIC,
  type OverviewMetric,
  withParam,
} from "@/lib/url-state";

const WAITING_BELOW = 10;

const GRAIN: Record<Granularity, string> = {
  hour: "per hour",
  day: "per day",
  week: "per week",
  month: "per month",
};

/** The KPI strip, the lead chart it drives, the goal panel and the devices split (design §8.1). */
export function Lead({
  slug,
  siteUrl,
  hasFilters,
  isGuest,
  kpi,
  metric,
  granularity,
  timezone,
  compare,
  summary,
  series,
  goal,
  devices,
}: {
  slug: string;
  siteUrl: string;
  hasFilters: boolean;
  isGuest: boolean;
  kpi: Kpi;
  metric: OverviewMetric;
  granularity: Granularity;
  timezone: string;
  compare: boolean;
  summary: Settled<{ current: Summary; compare: Summary | null }>;
  series: Settled<SeriesData>;
  goal: Settled<GoalData | null>;
  devices: Settled<DevicesData>;
}) {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const setMetric = (key: string) => {
    const next = key === DEFAULT_METRIC ? undefined : (key as OverviewMetric);
    update(withParam(state, "metric", next), { replace: true });
    announce(`Chart shows ${key.replace("_", " ")}.`);
  };
  // fewer than ten pageviews reads as "waiting for data" (design §8.11)
  const noData =
    summary.ok && summary.data.current.pageviews < WAITING_BELOW && !hasFilters;

  return (
    <div
      aria-busy={pending}
      className={
        pending ? "opacity-70 transition-opacity" : "transition-opacity"
      }
    >
      {noData && (
        <NoDataPanel
          siteUrl={siteUrl}
          slug={slug}
          pageviews={summary.ok ? summary.data.current.pageviews : 0}
        />
      )}
      {summary.ok ? (
        <>
          <VisitorTotal value={summary.data.current.visitors} />
          <KpiStrip
            value={metric}
            onChange={setMetric}
            tiles={tiles(summary.data, kpi, goal, slug)}
          />
        </>
      ) : (
        <SectionError title="Summary" strong />
      )}

      <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        {series.ok ? (
          <Section
            title={series.data.label}
            qualifier={GRAIN[granularity]}
            right={
              <NotesSlot
                slug={slug}
                count={series.data.notes.length}
                form={
                  <NoteForm
                    slug={slug}
                    timezone={timezone}
                    isGuest={isGuest}
                    trigger={
                      <button type="button" className="hover:text-ink">
                        + Add note
                      </button>
                    }
                  />
                }
              />
            }
          >
            <LineChart
              title={`${series.data.label} ${GRAIN[granularity]}`}
              series={[
                {
                  name: series.data.label,
                  points: series.data.current,
                  previous:
                    compare && series.data.previous
                      ? series.data.previous
                      : undefined,
                  format: formatFor(metric),
                },
              ]}
              granularity={granularity}
              timezone={timezone}
              height={220}
              notes={series.data.notes}
            />
          </Section>
        ) : (
          <SectionError title="Trend" />
        )}
        <div className="flex flex-col gap-5">
          <GoalPanel slug={slug} kpi={kpi} goal={goal} compare={compare} />
          <DevicesPanel devices={devices} compare={compare} />
        </div>
      </div>
    </div>
  );
}

function formatFor(
  metric: OverviewMetric
): ((v: number) => string) | undefined {
  if (metric === "bounce_rate") return (v) => fmtPct(v, 0);
  if (metric === "engaged_time") return (v) => fmtDuration(v);
  return undefined;
}

function tiles(
  s: { current: Summary; compare: Summary | null },
  kpi: Kpi,
  goal: Settled<GoalData | null>,
  slug: string
): KpiTile[] {
  const cur = s.current;
  const prev = s.compare;
  const note = (v: string) => (prev ? `vs ${v}` : undefined);
  const list: KpiTile[] = [
    {
      key: "visitors",
      label: "Unique visitors",
      value: fmtInt(cur.visitors),
      delta: prev && (
        <DeltaBadge current={cur.visitors} previous={prev.visitors} />
      ),
      note: note(fmtInt(prev?.visitors ?? 0)),
    },
    {
      key: "sessions",
      label: "Sessions",
      value: fmtInt(cur.sessions),
      delta: prev && (
        <DeltaBadge current={cur.sessions} previous={prev.sessions} />
      ),
      note: note(fmtInt(prev?.sessions ?? 0)),
    },
    {
      key: "pageviews",
      label: "Pageviews",
      value: fmtInt(cur.pageviews),
      delta: prev && (
        <DeltaBadge current={cur.pageviews} previous={prev.pageviews} />
      ),
      note: note(fmtInt(prev?.pageviews ?? 0)),
      href: `/${slug}/pages`,
      hrefLabel: "Pages",
    },
    {
      key: "bounce_rate",
      label: "Bounce rate",
      value: cur.sessions ? fmtPct(cur.bounce_rate, 0) : "—",
      delta:
        prev && cur.sessions && prev.sessions ? (
          <DeltaBadge
            current={cur.bounce_rate}
            previous={prev.bounce_rate}
            lowerIsBetter
            points
          />
        ) : undefined,
      note: prev?.sessions ? `vs ${fmtPct(prev.bounce_rate, 0)}` : undefined,
    },
    {
      key: "engaged_time",
      label: "Engaged time",
      value: cur.sessions ? fmtDuration(cur.engaged_time) : "—",
      delta:
        prev && cur.sessions && prev.sessions ? (
          <DeltaBadge current={cur.engaged_time} previous={prev.engaged_time} />
        ) : undefined,
      note: prev?.sessions ? `vs ${fmtDuration(prev.engaged_time)}` : undefined,
    },
  ];
  if (!kpi.goal) {
    list.push({
      key: "kpi",
      label: "KPI",
      value: "",
      ghost: { href: `/${slug}/goals`, text: "Set a KPI" },
    });
  } else if (goal.ok && goal.data) {
    const g = goal.data;
    list.push({
      key: "kpi",
      label: kpi.goal.name,
      value: fmtInt(g.stats.completions),
      delta: g.previous && (
        <DeltaBadge
          current={g.stats.completions}
          previous={g.previous.completions}
        />
      ),
      note: `${fmtRatio(g.stats.converting_sessions, g.stats.sessions)} conversion`,
      href: `/${slug}/goals`,
      hrefLabel: "Goals",
    });
  } else {
    list.push({
      key: "kpi",
      label: kpi.goal.name,
      value: "—",
      note: "Couldn't load",
      href: `/${slug}/goals`,
      hrefLabel: "Goals",
    });
  }
  return list;
}

function GoalPanel({
  slug,
  kpi,
  goal,
  compare,
}: {
  slug: string;
  kpi: Kpi;
  goal: Settled<GoalData | null>;
  compare: boolean;
}) {
  if (!kpi.goal) {
    return (
      <Section title="KPI goal" strong>
        <p className="text-[12.5px] text-mute">
          Mark a goal as the KPI to see completions, conversion and the funnel
          here.{" "}
          <Link
            href={`/${slug}/goals`}
            className="text-teal-ink underline underline-offset-2"
          >
            Set a KPI
          </Link>
        </p>
      </Section>
    );
  }
  if (!goal.ok || !goal.data)
    return <SectionError title={kpi.goal.name} strong />;
  const { stats, previous, reached } = goal.data;
  const target = kpi.goal.target;
  const max = Math.max(1, stats.sessions);
  return (
    <Section title={kpi.goal.name} qualifier="KPI goal" strong>
      <div className="text-[34px] font-medium leading-none tracking-[-0.02em] tabular">
        {fmtInt(stats.completions)}{" "}
        {compare && previous && (
          <DeltaBadge
            current={stats.completions}
            previous={previous.completions}
          />
        )}
      </div>
      <p className="mt-2 text-[12.5px] text-mute">
        {stats.sessions
          ? `${fmtRatio(stats.converting_sessions, stats.sessions)} of sessions converted.`
          : "No sessions in this period."}
        {target
          ? ` ${fmtRatio(stats.completions, target, 0)} of the target of ${fmtInt(target)} per month.`
          : ""}
        {stats.median_seconds !== null
          ? ` Median ${fmtDuration(stats.median_seconds * 1000)} to convert.`
          : ""}
      </p>
      <div className="mt-3 flex flex-col gap-1">
        <RowBar
          label="Visited the site"
          value={fmtInt(stats.sessions)}
          share={100}
        />
        <RowBar
          label={
            kpi.goal.kind === "pageview"
              ? `Saw ${kpi.goal.match}`
              : `Fired ${kpi.goal.match}`
          }
          value={fmtInt(reached)}
          share={(reached / max) * 100}
        />
        <RowBar
          label="Completed"
          value={fmtInt(stats.converting_sessions)}
          share={(stats.converting_sessions / max) * 100}
        />
      </div>
    </Section>
  );
}

function DevicesPanel({
  devices,
  compare,
}: {
  devices: Settled<DevicesData>;
  compare: boolean;
}) {
  if (!devices.ok) return <SectionError title="Devices" strong />;
  const segments = devices.data.rows.map((r) => ({
    key: r.value,
    label: displayValue("device", r.value),
    value: Number(r.visitors ?? 0),
    previous: devices.data.previous
      ? Number(devices.data.previous[r.value]?.visitors ?? 0)
      : undefined,
  }));
  return (
    <Section title="Devices" qualifier="visitors" strong>
      {segments.length ? (
        <SplitBar title="Devices" segments={segments} compare={compare} />
      ) : (
        <p className="text-[12.5px] text-mute">No data for this period.</p>
      )}
    </Section>
  );
}

function NoDataPanel({
  siteUrl,
  slug,
  pageviews,
}: {
  siteUrl: string;
  slug: string;
  pageviews: number;
}) {
  const snippet = `<script defer src="https://lynq.byharsh.com/js/lynq.js" data-site="${siteUrl}"></script>`;
  return (
    <div className="mb-6 rounded-card border border-rule-strong p-4 text-[13px]">
      <p className="font-medium">
        {pageviews === 0
          ? `Waiting for data from ${siteUrl}.`
          : `Waiting for data: ${pageviews} ${pageviews === 1 ? "pageview" : "pageviews"} so far.`}
      </p>
      <p className="mt-1 text-mute">
        Add the snippet before the closing head tag, then{" "}
        <Link
          href={`/sites/new?site=${slug}&step=2`}
          className="text-teal-ink underline underline-offset-2"
        >
          watch it arrive
        </Link>
        .
      </p>
      <pre className="mt-2 overflow-x-auto rounded-control bg-soft p-3 text-[12px]">
        {snippet}
      </pre>
    </div>
  );
}

export type { Point };
