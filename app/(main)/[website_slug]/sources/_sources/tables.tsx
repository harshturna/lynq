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
import { fmtPct, fmtRatio, fmtRevenue } from "@/lib/format";
import type { BreakdownMultiRow } from "@/lib/query/breakdown";
import type { Kpi } from "@/lib/screens/kpi";
import type { Section as Settled } from "@/lib/screens/settle";
import type { SourcesTable } from "@/lib/screens/sources";
import { withFilter } from "@/lib/url-state";

const SHOWN = 10;

const pct: Column["format"] = (v) => (v === null ? "—" : fmtPct(Number(v)));
const money: Column["format"] = (v) =>
  v === null ? "—" : fmtRevenue(Number(v));

function columnsFor(kpi: Kpi, withBounce: boolean, visitors: number): Column[] {
  const cols: Column[] = [
    { key: "visitors", header: "Visitors", align: "right", width: "96px" },
    {
      key: "share",
      header: "Share",
      align: "right",
      width: "72px",
      sortable: false,
      format: (_, row) => fmtRatio(Number(row.cells.visitors ?? 0), visitors),
    },
    {
      key: "sessions",
      header: "Sessions",
      align: "right",
      width: "96px",
      secondary: true,
    },
  ];
  if (withBounce)
    cols.push({
      key: "bounce_rate",
      header: "Bounce",
      align: "right",
      width: "84px",
      lowerIsBetter: true,
      points: true,
      format: pct,
      secondary: true,
    });
  if (kpi.goal)
    cols.push(
      {
        key: "goal_completions",
        header: "Completions",
        align: "right",
        width: "110px",
      },
      {
        key: "conversion",
        header: "Conv.",
        align: "right",
        width: "84px",
        points: true,
        format: pct,
      }
    );
  if (kpi.hasRevenue)
    cols.push({
      key: "revenue",
      header: "Revenue",
      align: "right",
      width: "100px",
      format: money,
    });
  return cols;
}

/** What the table shows (D-013); `columnsFor` is the drawer's and the CSV's full set. */
function shownFor(region: string, kpi: Kpi): Column[] {
  const visitors: Column = { key: "visitors", header: "Visitors" };
  if (region === "channels") return [visitors];
  const conversion: Column = {
    key: "conversion",
    header: "Conv.",
    points: true,
    format: pct,
  };
  if (region === "sources")
    return [
      visitors,
      ...(kpi.goal ? [conversion] : []),
      ...(kpi.hasRevenue
        ? [
            {
              key: "revenue",
              header: "Revenue",
              format: money,
              secondary: true,
            } as Column,
          ]
        : []),
    ];
  return [
    visitors,
    ...(kpi.goal
      ? [
          { key: "goal_completions", header: "Completions", secondary: true },
          { ...conversion, secondary: true },
        ]
      : []),
  ];
}

const LABEL: Record<string, string> = {
  channels: "Channel",
  sources: "Source",
  referrers: "Referrer",
  campaign: "Campaign",
  medium: "Medium",
  term: "Term",
  content: "Content",
};

function toRows(t: SourcesTable): TableRow[] {
  const numeric = (r: BreakdownMultiRow) =>
    Object.fromEntries(
      Object.entries(r)
        .filter(([k]) => k !== "value" && k !== "value2" && k !== "total")
        .map(([k, v]) => [k, v === null ? null : Number(v)])
    ) as Record<string, number | null>;
  return t.rows.map((r) => ({
    id: r.value,
    label: displayValue(t.dimension, r.value),
    cells: numeric(r),
    previous: t.previous
      ? t.previous[r.value]
        ? numeric(t.previous[r.value])
        : {}
      : undefined,
  }));
}

/** Channels, Sources / Referrers and Campaigns (design §8.4). */
export function SourcesTables({
  kpi,
  compare,
  hasFilters,
  channels,
  sources,
  campaigns,
}: {
  kpi: Kpi;
  compare: boolean;
  hasFilters: boolean;
  channels: Settled<SourcesTable>;
  sources: Settled<SourcesTable>;
  campaigns: Settled<SourcesTable>;
}) {
  const emptyText = hasFilters
    ? "Nothing matches these filters"
    : "No sessions in this period";
  return (
    <>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
        <Region
          region="channels"
          title="Channels"
          data={channels}
          kpi={kpi}
          compare={compare}
          emptyText={emptyText}
          withBounce
        />
        <Region
          region="sources"
          title="Sources"
          views={[
            { key: "sources", label: "Sources" },
            { key: "referrers", label: "Referrers" },
          ]}
          data={sources}
          kpi={kpi}
          compare={compare}
          emptyText={emptyText}
          withBounce
        />
      </div>
      <Region
        region="campaigns"
        title="Campaigns"
        qualifier="utm"
        views={[
          { key: "campaign", label: "Campaign" },
          { key: "medium", label: "Medium" },
          { key: "term", label: "Term" },
          { key: "content", label: "Content" },
        ]}
        data={campaigns}
        kpi={kpi}
        compare={compare}
        emptyText={
          hasFilters
            ? "Nothing matches these filters"
            : "No campaign traffic in this period"
        }
      />
    </>
  );
}

function Region({
  region,
  title,
  qualifier,
  views,
  data,
  kpi,
  compare,
  emptyText,
  withBounce = false,
}: {
  region: string;
  title: string;
  qualifier?: string;
  views?: { key: string; label: string }[];
  data: Settled<SourcesTable>;
  kpi: Kpi;
  compare: boolean;
  emptyText: string;
  withBounce?: boolean;
}) {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const [drawer, setDrawer] = useState(false);
  if (!data.ok) return <SectionError title={title} />;
  const t = data.data;
  const columns = columnsFor(kpi, withBounce, t.visitors);
  const shown = shownFor(region, kpi);
  const rows = toRows(t);
  const filter = (row: TableRow) => {
    update(
      withFilter(state, { dimension: t.dimension, op: "is", values: [row.id] })
    );
    announce(`Added ${filterSentence(t.dimension, "is", [row.id])}.`);
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
        title={
          qualifier ? (
            <>
              {title}{" "}
              <span className="text-[12.5px] font-normal text-mute">
                {qualifier}
              </span>
            </>
          ) : (
            title
          )
        }
        views={views}
        defaultView={views?.[0]?.key}
        labelHeader={LABEL[t.view] ?? LABEL[region] ?? title}
        columns={shown}
        rows={rows.slice(0, SHOWN)}
        bar={region === "channels" ? "visitors" : undefined}
        fill={region !== "campaigns"}
        defaultSort={{ col: "visitors", dir: "desc" }}
        onFilter={filter}
        total={t.total}
        onShowAll={rows.length > SHOWN ? () => setDrawer(true) : undefined}
        exportName={`${region}-${t.view}`}
        emptyText={emptyText}
        compare={compare}
      />
      <ShowAllDrawer
        open={drawer}
        onOpenChange={setDrawer}
        title={(() => {
          const view = views?.find((v) => v.key === t.view)?.label;
          return view && view !== title ? `${title} · ${view}` : title;
        })()}
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
