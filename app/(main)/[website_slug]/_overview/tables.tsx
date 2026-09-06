"use client";

import { useState } from "react";
import {
  type Column,
  DataTable,
  type TableRow,
} from "@/components/shell/data-table";
import { displayValue, filterSentence } from "@/components/shell/dimensions";
import { ShowAllDrawer } from "@/components/shell/drawer";
import { SectionError } from "@/components/shell/section-error";
import { useAnnounce, useViewState } from "@/components/shell/view-state";
import { fmtDuration, fmtPct, fmtRevenue } from "@/lib/format";
import type { BreakdownMultiRow } from "@/lib/query/breakdown";
import type { Kpi } from "@/lib/screens/kpi";
import type { TableData } from "@/lib/screens/overview";
import type { Section as Settled } from "@/lib/screens/settle";
import { withFilter } from "@/lib/url-state";

const SHOWN = 8;
/** The label column's header per region and view. */
const LABEL: Record<string, Record<string, string>> = {
  pages: { top: "Page", entry: "Entry page", exit: "Exit page" },
  sources: { channels: "Channel", sources: "Source", campaigns: "Campaign" },
  locations: { countries: "Country", regions: "Region", cities: "City" },
};

const pct: Column["format"] = (v) => (v === null ? "—" : fmtPct(Number(v)));
const dur: Column["format"] = (v) =>
  v === null ? "—" : fmtDuration(Number(v));
const money: Column["format"] = (v) =>
  v === null ? "—" : fmtRevenue(Number(v));

const COL: Record<string, Column> = {
  visitors: {
    key: "visitors",
    header: "Visitors",
    align: "right",
    width: "96px",
  },
  pageviews: {
    key: "pageviews",
    header: "Pageviews",
    align: "right",
    width: "96px",
    secondary: true,
  },
  sessions: {
    key: "sessions",
    header: "Sessions",
    align: "right",
    width: "96px",
  },
  sessions2: {
    key: "sessions",
    header: "Sessions",
    align: "right",
    width: "96px",
    secondary: true,
  },
  visitors2: {
    key: "visitors",
    header: "Visitors",
    align: "right",
    width: "96px",
    secondary: true,
  },
  bounce_rate: {
    key: "bounce_rate",
    header: "Bounce",
    align: "right",
    width: "84px",
    lowerIsBetter: true,
    points: true,
    format: pct,
  },
  engaged_time: {
    key: "engaged_time",
    header: "Engaged",
    align: "right",
    width: "90px",
    secondary: true,
    format: dur,
  },
  goal_completions: {
    key: "goal_completions",
    header: "Completions",
    align: "right",
    width: "110px",
  },
  conversion: {
    key: "conversion",
    header: "Conv.",
    align: "right",
    width: "84px",
    points: true,
    format: pct,
  },
  revenue: {
    key: "revenue",
    header: "Revenue",
    align: "right",
    width: "100px",
    format: money,
  },
};

function columnsFor(region: string, view: string, kpi: Kpi): Column[] {
  if (region === "pages")
    return view === "top"
      ? [COL.visitors, COL.pageviews, COL.bounce_rate, COL.engaged_time]
      : [COL.sessions, COL.visitors2, COL.bounce_rate, COL.engaged_time];
  if (region === "sources")
    return [
      COL.visitors,
      COL.sessions2,
      COL.bounce_rate,
      ...(kpi.goal ? [COL.goal_completions, COL.conversion] : []),
      ...(kpi.hasRevenue ? [COL.revenue] : []),
    ];
  return [COL.visitors, COL.pageviews, COL.bounce_rate];
}

function toRows(data: TableData): TableRow[] {
  const numeric = (r: BreakdownMultiRow) =>
    Object.fromEntries(
      Object.entries(r)
        .filter(([k]) => k !== "value" && k !== "value2" && k !== "total")
        .map(([k, v]) => [k, v === null ? null : Number(v)])
    ) as Record<string, number | null>;
  return data.rows.map((r) => ({
    id: r.value,
    label: displayValue(data.dimension, r.value),
    cells: numeric(r),
    previous: data.previous
      ? data.previous[r.value]
        ? numeric(data.previous[r.value])
        : {}
      : undefined,
  }));
}

/**
 * Pages, Sources and Locations (design §8.1, D-013): one ranked metric per
 * table with the bar column; Show all opens the drawer with every column;
 * views in the URL; rows filter on Enter.
 */
export function Tables({
  kpi,
  compare,
  hasFilters,
  pages,
  sources,
  locations,
}: {
  kpi: Kpi;
  compare: boolean;
  hasFilters: boolean;
  pages: Settled<TableData>;
  sources: Settled<TableData>;
  locations: Settled<TableData>;
}) {
  const emptyText = hasFilters
    ? "Nothing matches these filters"
    : "No data for this period";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
      <Region
        region="pages"
        title="Pages"
        views={[
          { key: "top", label: "Top" },
          { key: "entry", label: "Entry" },
          { key: "exit", label: "Exit" },
        ]}
        data={pages}
        kpi={kpi}
        compare={compare}
        emptyText={emptyText}
      />
      <Region
        region="sources"
        title="Sources"
        views={[
          { key: "channels", label: "Channels" },
          { key: "sources", label: "Sources" },
          { key: "campaigns", label: "Campaigns" },
        ]}
        data={sources}
        kpi={kpi}
        compare={compare}
        emptyText={emptyText}
      />
      <Region
        region="locations"
        title="Locations"
        views={[
          { key: "countries", label: "Countries" },
          { key: "regions", label: "Regions" },
          { key: "cities", label: "Cities" },
        ]}
        data={locations}
        kpi={kpi}
        compare={compare}
        emptyText={emptyText}
      />
    </div>
  );
}

function Region({
  region,
  title,
  views,
  data,
  kpi,
  compare,
  emptyText,
}: {
  region: string;
  title: string;
  views: { key: string; label: string }[];
  data: Settled<TableData>;
  kpi: Kpi;
  compare: boolean;
  emptyText: string;
}) {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const [drawer, setDrawer] = useState(false);
  if (!data.ok) return <SectionError title={title} />;
  const columns = columnsFor(region, data.data.view, kpi);
  const rows = toRows(data.data);
  const dimension = data.data.dimension;
  const filter = (row: TableRow) => {
    update(withFilter(state, { dimension, op: "is", values: [row.id] }));
    announce(`Added ${filterSentence(dimension, "is", [row.id])}.`);
  };
  return (
    <div
      aria-busy={pending}
      className={
        pending ? "opacity-70 transition-opacity" : "transition-opacity"
      }
    >
      <DataTable
        region={region}
        title={title}
        views={views}
        defaultView={views[0].key}
        labelHeader={LABEL[region]?.[data.data.view] ?? title}
        columns={[columns[0]]}
        rows={rows.slice(0, SHOWN)}
        bar={columns[0].key}
        fill
        defaultSort={{ col: columns[0].key, dir: "desc" }}
        onFilter={filter}
        total={data.data.total}
        onShowAll={rows.length ? () => setDrawer(true) : undefined}
        exportName={`${region}-${data.data.view}`}
        emptyText={emptyText}
        compare={compare}
      />
      <ShowAllDrawer
        open={drawer}
        onOpenChange={setDrawer}
        title={`${title} · ${views.find((v) => v.key === data.data.view)?.label ?? ""}`}
        columns={columns}
        rows={rows}
        onPick={(row) => {
          setDrawer(false);
          filter(row);
        }}
      />
    </div>
  );
}
