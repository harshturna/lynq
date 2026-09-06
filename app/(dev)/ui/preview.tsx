"use client";

import { Suspense, useCallback, useState } from "react";
import {
  BarChart,
  LineChart,
  Sparkline,
  trendLabel,
} from "@/components/charts/charts";
import { DotPlot, Heatmap, Histogram } from "@/components/charts/shapes";
import { DeltaBadge, Pill } from "@/components/shell/badge";
import { Control, Segmented } from "@/components/shell/control";
import {
  type Column,
  DataTable,
  type TableRow,
} from "@/components/shell/data-table";
import { ShowAllDrawer } from "@/components/shell/drawer";
import { FilterBuilder } from "@/components/shell/filter-builder";
import { FilterChips } from "@/components/shell/filter-chips";
import { KpiStrip } from "@/components/shell/kpi-strip";
import { LiveDot, PageHeader } from "@/components/shell/page-header";
import { ComparePicker, RangePicker } from "@/components/shell/range-picker";
import {
  presetDates,
  rangeLabel,
  stepRange,
  todayIn,
} from "@/components/shell/ranges";
import { RowBar, Section } from "@/components/shell/section";
import { Shortcuts } from "@/components/shell/shortcuts";
import { StripSkeleton, TableSkeleton } from "@/components/shell/skeleton";
import { TopNav } from "@/components/shell/top-nav";
import {
  ShellProvider,
  useAnnounce,
  useViewState,
} from "@/components/shell/view-state";
import {
  FlowPanel,
  Funnel,
  Matrix,
  PathList,
  SplitBar,
} from "@/components/shell/views";
import { makeBins } from "@/lib/charts/histogram";
import { withFilter, withParam } from "@/lib/url-state";

/** Every shell component on sample data (TICKET-030 to TICKET-033). */
const HOURS = (peak: number, scale: number) =>
  Array.from({ length: 24 }, (_, h) => {
    const d = Math.min(Math.abs(h - peak), 24 - Math.abs(h - peak));
    return Math.round(scale * Math.exp(-(d * d) / 18) + ((h * 7) % 5));
  });
const HEATMAP = [
  ["Canada", 14, 120],
  ["United States", 15, 90],
  ["India", 9, 70],
  ["United Kingdom", 12, 40],
  ["Germany", 11, 30],
  ["Australia", 4, 18],
].map(([label, peak, scale]) => ({
  key: String(label),
  label: String(label),
  hours: HOURS(Number(peak), Number(scale)),
}));
const VIEWPORTS = makeBins(
  [0, 400, 640, 800, 1024, 1280, 1536, 2000],
  [180, 1210, 240, 310, 980, 1640, 420],
  undefined,
  (from, to) => `${from}–${to}`
);
const LCP = makeBins(
  [0, 1000, 2500, 4000, 8000],
  [1420, 2210, 640, 190],
  (from) => (from < 2500 ? "good" : from < 4000 ? "warn" : "poor"),
  (from, to) => `${from / 1000}–${to / 1000}s`
);
const CHANNEL_RATES = [
  ["Newsletter", 7.2],
  ["Referral", 5.1],
  ["Organic Search", 3.4],
  ["Direct", 4.1],
  ["Social", 0.9],
  ["Paid", 2.2],
].map(([label, value]) => ({
  key: String(label),
  label: String(label),
  value: Number(value),
}));
const FLOW_FROM = [
  { key: "/", label: "/", count: 1290 },
  { key: "/docs/getting-started", label: "/docs/getting-started", count: 410 },
  { key: "google", label: "Google (entry)", count: 380 },
  { key: "/blog/launch", label: "/blog/launch", count: 210 },
];
const FLOW_TO = [
  { key: "/signup", label: "/signup", count: 1102 },
  { key: "exit", label: "Left the site", count: 890 },
  { key: "/docs/api", label: "/docs/api", count: 260 },
  { key: "/", label: "/", count: 140 },
];
const PATHS = [
  { key: "a", steps: ["/", "/pricing", "/signup"], count: 312 },
  { key: "b", steps: ["/blog/launch", "/pricing", "/signup"], count: 128 },
  { key: "c", steps: ["/docs/getting-started", "/signup"], count: 96 },
  { key: "d", steps: ["/", "/signup"], count: 71 },
];
const MATRIX = {
  rows: ["Chrome", "Safari", "Firefox", "Edge"],
  cols: ["macOS", "Windows", "iOS", "Android", "Linux"],
  cells: [
    [3120, 4210, 380, 2640, 410],
    [1980, null, 3110, null, null],
    [420, 610, null, 90, 260],
    [120, 890, null, null, null],
  ],
};
const SPLIT = [
  { key: "desktop", label: "Desktop", value: 9120, previous: 8410 },
  { key: "mobile", label: "Mobile", value: 6230, previous: 6890 },
  { key: "tablet", label: "Tablet", value: 640, previous: 610 },
];

const SITE = { slug: "ui", name: "Aivia", url: "aivia.byharsh.com" };
const SITES = [
  SITE,
  { slug: "lynq-byharsh-com", name: "Lynq", url: "lynq.byharsh.com" },
];
const TZ = "America/Toronto";
const SUGGEST: Record<string, string[]> = {
  country: ["CA", "US", "IN", "GB", "DE"],
  path: ["/", "/pricing", "/docs/getting-started", "/signup"],
  channel: ["Organic Search", "Direct", "Referral", "Social", "Email"],
  device: ["desktop", "mobile", "tablet"],
};

const PAGE_COLUMNS: Column[] = [
  { key: "visitors", header: "Visitors", align: "right", width: "110px" },
  {
    key: "trend",
    header: "Trend",
    align: "right",
    width: "84px",
    sortable: false,
    secondary: true,
    format: (_, row) => {
      const values = sparkOf(row.id.length);
      return (
        <Sparkline
          values={values}
          label={trendLabel(values)}
          accent={row.id === "/pricing"}
        />
      );
    },
  },
  {
    key: "pageviews",
    header: "Pageviews",
    align: "right",
    width: "100px",
    secondary: true,
  },
  {
    key: "bounce",
    header: "Bounce",
    align: "right",
    width: "80px",
    lowerIsBetter: true,
    format: (v) => (typeof v === "number" ? `${v}%` : "—"),
  },
  {
    key: "engaged",
    header: "Engaged",
    align: "right",
    width: "84px",
    format: (v) =>
      typeof v === "number"
        ? `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`
        : "—",
  },
];
const PAGES: TableRow[] = [
  ["/", 4490, 6120, 38, 52, 4120],
  ["/pricing", 2610, 3105, 31, 74, 2290],
  ["/docs/getting-started", 1520, 2010, 22, 188, 1570],
  ["/blog/web-vitals-explained", 955, 1010, 61, 161, 677],
  ["/signup", 810, 860, 12, 62, 764],
  ["/dashboard", 780, 1990, 8, 260, 757],
  ["/docs/events", 640, 790, 27, 175, 627],
  ["/features", 610, 700, 29, 91, 581],
  ["/login", 402, 420, 10, 21, 406],
].map(([id, visitors, pageviews, bounce, engaged, prev]) => ({
  id: String(id),
  label: String(id),
  cells: {
    visitors: Number(visitors),
    pageviews: Number(pageviews),
    bounce: Number(bounce),
    engaged: Number(engaged),
  },
  previous: { visitors: Number(prev), bounce: Number(bounce) - 2 },
}));
const BROWSERS: TableRow[] = [
  {
    id: "Chrome",
    label: "Chrome",
    cells: { visitors: 6980, share: 56 },
    previous: { visitors: 6700 },
    children: [
      {
        id: "Chrome 128",
        label: "128",
        childPrefix: "Chrome, version",
        cells: { visitors: 3990, share: 32 },
      },
      {
        id: "Chrome 127",
        label: "127",
        childPrefix: "Chrome, version",
        cells: { visitors: 1810, share: 15 },
      },
    ],
  },
  {
    id: "Safari",
    label: "Safari",
    cells: { visitors: 2870, share: 23 },
    previous: { visitors: 2630 },
  },
  {
    id: "Edge",
    label: "Edge",
    cells: { visitors: 1120, share: 9 },
    previous: { visitors: 1150 },
  },
  {
    id: "Firefox",
    label: "Firefox",
    cells: { visitors: 990, share: 8 },
    previous: { visitors: 980 },
  },
];
const rnd = (seed: number) => {
  let x = seed;
  return () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
};
const DAYS = 30;
const dayIso = (i: number) => new Date(Date.UTC(2026, 7, 6 + i)).toISOString();
const seriesOf = (base: number, growth: number, seed: number) => {
  const r = rnd(seed);
  return Array.from({ length: DAYS }, (_, i) => ({
    t: dayIso(i),
    v: Math.round(base * (1 + (growth * i) / (DAYS - 1)) * (0.82 + 0.36 * r())),
  }));
};
const VISITORS = seriesOf(380, 0.7, 11);
const VISITORS_PREV = seriesOf(340, 0.5, 12);
const MINUTES = Array.from({ length: 30 }, (_, i) => ({
  label: i % 5 === 0 ? `-${30 - i}m` : "",
  value: 1 + Math.round(4 * Math.abs(Math.sin(i / 3))),
}));
const sparkOf = (seed: number) =>
  seriesOf(10, 0.4, seed)
    .slice(0, 12)
    .map((p) => p.v);
const MANY: TableRow[] = Array.from({ length: 800 }, (_, i) => ({
  id: `/docs/page-${i + 1}`,
  label: `/docs/page-${i + 1}`,
  cells: {
    visitors: Math.round(4000 / (i + 1)) + 3,
    pageviews: Math.round(5000 / (i + 1)) + 5,
    bounce: 20 + (i % 50),
    engaged: 30 + (i % 200),
  },
}));

function Body() {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const [metric, setMetric] = useState("visitors");
  const [live, setLive] = useState<"30m" | "1h">("30m");
  const [drawer, setDrawer] = useState(false);
  const today = todayIn(TZ);
  const dates = presetDates(state.range, today);
  const step = useCallback(
    (d: -1 | 1) => {
      const next = stepRange(state.range, d, today);
      if (next !== state.range) update(withParam(state, "range", next));
    },
    [state, update, today]
  );
  const filterPath = (row: TableRow) => {
    update(
      withFilter(state, { dimension: "path", op: "is", values: [row.id] })
    );
    announce(`Added Page is ${row.id}.`);
  };
  const compare = state.compare !== "none";

  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-7 px-8 py-6">
      <Shortcuts enabled onRangeStep={step} />
      <PageHeader
        title="Overview"
        subtitle={
          <>
            <LiveDot>6 on the site now</LiveDot> ·{" "}
            {rangeLabel({ from: dates.from, to: dates.to })} ·{" "}
            {compare ? "compared with the previous period" : "no comparison"} ·{" "}
            {TZ}
          </>
        }
        controls={
          <>
            <RangePicker timezone={TZ} />
            <ComparePicker />
            <FilterBuilder
              id="add-filter"
              suggest={async (d) => SUGGEST[d] ?? []}
            />
            <Control variant="dark">Share</Control>
          </>
        }
      />
      <FilterChips addButtonId="add-filter" />

      <div
        aria-busy={pending}
        className={
          pending ? "opacity-70 transition-opacity" : "transition-opacity"
        }
      >
        <KpiStrip
          value={metric}
          onChange={setMetric}
          tiles={[
            {
              key: "visitors",
              label: "Unique visitors",
              value: "12,480",
              delta: <DeltaBadge current={12480} previous={11534} />,
              note: "vs 11,534",
            },
            {
              key: "sessions",
              label: "Sessions",
              value: "15,212",
              delta: <DeltaBadge current={15212} previous={14351} />,
              note: "vs 14,351",
            },
            {
              key: "pageviews",
              label: "Pageviews",
              value: "31,905",
              delta: <DeltaBadge current={31905} previous={30357} />,
              note: "vs 30,357",
              href: "/ui",
              hrefLabel: "Pages",
            },
            {
              key: "bounce",
              label: "Bounce rate",
              value: "42%",
              delta: (
                <DeltaBadge current={42} previous={39} lowerIsBetter points />
              ),
              note: "vs 39%",
            },
            {
              key: "engaged",
              label: "Engaged time",
              value: "1m 48s",
              delta: <DeltaBadge current={108} previous={96} />,
              note: "vs 1m 36s",
            },
            {
              key: "kpi",
              label: "KPI",
              value: "",
              ghost: { href: "/ui", text: "Set a KPI" },
            },
          ]}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <Section
          title="Unique visitors"
          qualifier="per day"
          right={
            <Segmented
              label="Granularity"
              options={[
                { value: "30m", label: "Hour" },
                { value: "1h", label: "Day" },
              ]}
              value={live}
              onChange={setLive}
            />
          }
        >
          <LineChart
            title="Unique visitors per day"
            series={[
              {
                name: "Unique visitors",
                points: VISITORS,
                previous: compare ? VISITORS_PREV : undefined,
              },
            ]}
            granularity="day"
            height={220}
          />
        </Section>
        <div className="flex flex-col gap-5">
          <Section title="Signups" qualifier="goal · last 30 days" strong>
            <div className="text-[34px] font-medium leading-none tracking-[-0.02em] tabular">
              424 <DeltaBadge current={3.4} previous={2.8} points />
            </div>
            <p className="mt-2 text-[12.5px] text-mute">
              3.4% of visitors converted. 68% of the monthly target of 620.
            </p>
            <div className="mt-3 flex flex-col gap-1">
              <RowBar label="Visited /pricing" value="2,610" share={100} />
              <RowBar label="Started signup" value="1,102" share={42} />
              <RowBar label="Completed" value="424" share={16} />
            </div>
          </Section>
          <Section title="Web Vitals" qualifier="p75" strong>
            <div className="flex flex-wrap gap-4 text-[13px]">
              <span>
                LCP <b className="font-medium">1.7s</b>{" "}
                <Pill status="good">Good</Pill>
              </span>
              <span>
                INP <b className="font-medium">312ms</b>{" "}
                <Pill status="warn">Needs work</Pill>
              </span>
              <span>
                TTFB <b className="font-medium">640ms</b>{" "}
                <Pill status="poor">Poor</Pill>
              </span>
              <span>
                CLS <b className="font-medium">—</b>{" "}
                <Pill status="none">No data</Pill>
              </span>
            </div>
          </Section>
        </div>
      </div>

      <Section title="Visitors per minute" qualifier="last 30 minutes" strong>
        <BarChart
          title="Visitors per minute"
          name="Visitors"
          bars={MINUTES}
          accentLast
          max={8}
          height={140}
        />
      </Section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
        <DataTable
          region="pages"
          title="Pages"
          views={[
            { key: "top", label: "Top" },
            { key: "entry", label: "Entry" },
            { key: "exit", label: "Exit" },
          ]}
          columns={PAGE_COLUMNS}
          rows={PAGES}
          defaultSort={{ col: "visitors", dir: "desc" }}
          selectedId={state.sel}
          onSelect={(row) =>
            update(withParam(state, "sel", row.id), { replace: true })
          }
          onFilter={filterPath}
          total={128}
          onShowAll={() => setDrawer(true)}
          exportName="pages"
          compare={compare}
        />
        <DataTable
          region="browsers"
          title="Browsers"
          views={[
            { key: "browser", label: "Browser" },
            { key: "version", label: "Version" },
          ]}
          columns={[
            {
              key: "visitors",
              header: "Visitors",
              align: "right",
              width: "96px",
            },
            {
              key: "share",
              header: "Share",
              align: "right",
              width: "60px",
              format: (v) => (typeof v === "number" ? `${v}%` : "—"),
            },
          ]}
          rows={BROWSERS}
          defaultSort={{ col: "visitors", dir: "desc" }}
          onFilter={(row) =>
            update(
              withFilter(state, {
                dimension: "browser",
                op: "is",
                values: [row.id.split(" ")[0]],
              })
            )
          }
          total={11}
          compare={compare}
        />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
        <Section
          title="Conversion by channel"
          qualifier="against the site average"
          strong
        >
          <DotPlot
            title="Conversion by channel"
            rows={CHANNEL_RATES}
            reference={3.2}
            referenceLabel="site average"
            format={(v) => `${v.toFixed(1)}%`}
          />
        </Section>
      </div>

      <Section title="Countries by hour" qualifier="site time" strong>
        <Heatmap
          title="Countries by hour of day"
          rows={HEATMAP}
          sessions={4200}
        />
      </Section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
        <Section title="Viewport width" qualifier="sessions" strong>
          <Histogram
            title="Viewport width"
            name="Sessions"
            bins={VIEWPORTS}
            samples={4980}
            markersAt={[
              { value: 640, label: "sm 640" },
              { value: 1024, label: "lg 1024" },
              { value: 1280, label: "xl 1280" },
            ]}
          />
        </Section>
        <Section title="LCP distribution" qualifier="samples" strong>
          <Histogram
            title="LCP distribution"
            name="Samples"
            bins={LCP}
            samples={4460}
          />
        </Section>
      </div>

      <Section title="Thresholds" qualifier="what shows with too little data">
        <div className="grid gap-4 min-[1000px]:grid-cols-2">
          <Histogram
            title="LCP (too few)"
            name="Samples"
            bins={LCP}
            samples={12}
          />
        </div>
      </Section>

      <Section title="Flow" qualifier="/pricing" strong>
        <FlowPanel
          node={{ label: "/pricing", count: 2610, qualifier: "visitors" }}
          from={FLOW_FROM}
          to={FLOW_TO}
          onPick={(r) => announce(`Picked ${r.label}`)}
        />
      </Section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
        <Section title="Signup funnel" qualifier="sessions" strong>
          <Funnel
            title="Signup funnel"
            steps={[
              { key: "visit", label: "Visited the site", count: 15990 },
              { key: "pricing", label: "Saw /pricing", count: 2610 },
              { key: "start", label: "Started signup", count: 1102 },
              { key: "done", label: "Completed", count: 424 },
            ]}
          />
        </Section>
        <Section title="Paths to signup" qualifier="top sequences" strong>
          <PathList
            paths={PATHS}
            endLabel="signup"
            onPick={(p) => announce(`${p.count} sessions`)}
          />
        </Section>
      </div>

      <Section title="Devices" qualifier="split and matrix" strong>
        <div className="flex flex-col gap-6">
          <SplitBar title="Devices" segments={SPLIT} compare={compare} />
          <Matrix
            title="Browser by operating system"
            rowHeader="Browser"
            data={MATRIX}
          />
        </div>
      </Section>

      <Section title="Skeletons" qualifier="what streams in first">
        <div className="flex flex-col gap-6">
          <StripSkeleton tiles={6} />
          <TableSkeleton />
        </div>
      </Section>

      <ShowAllDrawer
        open={drawer}
        onOpenChange={setDrawer}
        title="Pages"
        columns={PAGE_COLUMNS}
        rows={MANY}
        onPick={(row) => {
          setDrawer(false);
          update(withParam(state, "sel", row.id), { replace: true });
        }}
      />
      <pre className="rounded-control bg-soft p-4 text-[12px] text-ink-2">
        {JSON.stringify(state, null, 2)}
      </pre>
    </div>
  );
}

export function UiPreview() {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <Suspense>
        <ShellProvider>
          <TopNav site={SITE} sites={SITES} userEmail="harsh@example.com" />
          <Body />
        </ShellProvider>
      </Suspense>
    </div>
  );
}
