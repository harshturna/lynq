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
import { fmtPct, fmtRatio } from "@/lib/format";
import type { BreakdownMultiRow } from "@/lib/query/breakdown";
import type { Kpi } from "@/lib/screens/kpi";
import type { LocationTable } from "@/lib/screens/locations";
import type { Section as Settled } from "@/lib/screens/settle";
import { withFilter, withParam } from "@/lib/url-state";

const SHOWN = 10;
const LABEL: Record<string, string> = {
  countries: "Country",
  regions: "Region",
  cities: "City",
  languages: "Language",
};
const pct: Column["format"] = (v) => (v === null ? "—" : fmtPct(Number(v)));

function columnsFor(kpi: Kpi, visitors: number, withBounce: boolean): Column[] {
  const cols: Column[] = [
    { key: "visitors", header: "Visitors", align: "right", width: "96px" },
    {
      key: "share",
      header: "Share",
      align: "right",
      width: "64px",
      sortable: false,
      format: (_, row) => fmtRatio(Number(row.cells.visitors ?? 0), visitors),
    },
    {
      key: "pageviews",
      header: "Pageviews",
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
  if (kpi.goal && withBounce)
    cols.push({
      key: "goal_completions",
      header: kpi.goal.name,
      align: "right",
      width: "100px",
    });
  return cols;
}

function toRows(t: LocationTable): TableRow[] {
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

/** Countries, then the selected country's regions and cities, and languages (design §8.5). */
export function LocationsTables({
  kpi,
  compare,
  hasFilters,
  country,
  countries,
  regions,
  cities,
  languages,
}: {
  kpi: Kpi;
  compare: boolean;
  hasFilters: boolean;
  country: string | undefined;
  countries: Settled<LocationTable>;
  regions: Settled<LocationTable>;
  cities: Settled<LocationTable>;
  languages: Settled<LocationTable>;
}) {
  const { state, update } = useViewState();
  const emptyText = hasFilters
    ? "Nothing matches these filters"
    : "No visitors in this period";
  const geoEmpty =
    "No region or city data. Lynq reads them from the platform's geo headers, which were not present.";
  const where = country ? displayValue("country", country) : undefined;
  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center gap-2 text-[13px]">
        {country ? (
          <>
            <button
              type="button"
              onClick={() =>
                update(withParam(state, "sel", undefined), { replace: true })
              }
              className="text-teal-ink hover:underline"
            >
              All countries
            </button>
            <span aria-hidden className="text-faint">
              ›
            </span>
            <span className="font-medium">{where}</span>
            <span className="text-[12.5px] text-mute">
              · regions and cities below are within it
            </span>
          </>
        ) : (
          <span className="text-[12.5px] text-mute">
            Select a country to see its regions and cities.
          </span>
        )}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-3">
        <Region
          region="countries"
          title="Countries"
          data={countries}
          kpi={kpi}
          compare={compare}
          emptyText={emptyText}
          selectable
          withBounce
        />
        <Region
          region="regions"
          title="Regions"
          qualifier={where ? `in ${where}` : undefined}
          data={regions}
          kpi={kpi}
          compare={compare}
          emptyText={hasFilters ? emptyText : geoEmpty}
          withBounce
        />
        <Region
          region="cities"
          title="Cities"
          qualifier={where ? `in ${where}` : undefined}
          data={cities}
          kpi={kpi}
          compare={compare}
          emptyText={hasFilters ? emptyText : geoEmpty}
          withBounce
        />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
        <Region
          region="languages"
          title="Languages"
          data={languages}
          kpi={kpi}
          compare={compare}
          emptyText={emptyText}
        />
      </div>
    </div>
  );
}

function Region({
  region,
  title,
  qualifier,
  data,
  kpi,
  compare,
  emptyText,
  selectable = false,
  withBounce = false,
}: {
  region: string;
  title: string;
  qualifier?: string;
  data: Settled<LocationTable>;
  kpi: Kpi;
  compare: boolean;
  emptyText: string;
  selectable?: boolean;
  withBounce?: boolean;
}) {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const [drawer, setDrawer] = useState(false);
  if (!data.ok) return <SectionError title={title} />;
  const t = data.data;
  const columns = columnsFor(kpi, t.visitors, withBounce);
  // Countries is the regular table (visitors and the KPI); the narrower
  // tables rank visitors with the bar column (D-013). The drawer and the
  // CSV keep every column.
  const shown: Column[] = selectable
    ? [
        { key: "visitors", header: "Visitors" },
        ...(kpi.goal
          ? [{ key: "goal_completions", header: kpi.goal.name }]
          : []),
      ]
    : [{ key: "visitors", header: "Visitors" }];
  const rows = toRows(t);
  const filter = (row: TableRow) => {
    update(
      withFilter(state, { dimension: t.dimension, op: "is", values: [row.id] })
    );
    announce(`Added ${filterSentence(t.dimension, "is", [row.id])}.`);
  };
  const select = (row: TableRow) =>
    update(withParam(state, "sel", row.id), { replace: true });
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
        labelHeader={LABEL[region] ?? title}
        columns={shown}
        rows={rows.slice(0, SHOWN)}
        bar={selectable ? undefined : "visitors"}
        fill
        defaultSort={{ col: "visitors", dir: "desc" }}
        selectedId={selectable ? state.sel : undefined}
        onSelect={selectable ? select : undefined}
        onFilter={filter}
        total={t.total}
        onShowAll={rows.length > SHOWN ? () => setDrawer(true) : undefined}
        exportName={region}
        emptyText={emptyText}
        compare={compare}
      />
      <ShowAllDrawer
        open={drawer}
        onOpenChange={setDrawer}
        title={title}
        columns={columns}
        rows={rows}
        onPick={(row) => {
          setDrawer(false);
          if (selectable) select(row);
          else filter(row);
        }}
      />
    </div>
  );
}
