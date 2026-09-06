"use client";

import { useState } from "react";
import {
  type Column,
  DataTable,
  type TableRow,
} from "@/components/shell/data-table";
import { filterSentence } from "@/components/shell/dimensions";
import { ShowAllDrawer } from "@/components/shell/drawer";
import { SectionError } from "@/components/shell/section-error";
import { useAnnounce, useViewState } from "@/components/shell/view-state";
import { fmtPct } from "@/lib/format";
import type { BreakdownMultiRow } from "@/lib/query/breakdown";
import type { DeviceTable } from "@/lib/screens/devices";
import type { Section as Settled } from "@/lib/screens/settle";
import { withFilter } from "@/lib/url-state";

const SHOWN = 10;
const pct: Column["format"] = (v) => (v === null ? "—" : fmtPct(Number(v)));

const COLUMNS: Column[] = [
  { key: "visitors", header: "Visitors", align: "right", width: "96px" },
  {
    key: "pageviews",
    header: "Pageviews",
    align: "right",
    width: "96px",
    secondary: true,
  },
  {
    key: "bounce_rate",
    header: "Bounce",
    align: "right",
    width: "84px",
    lowerIsBetter: true,
    points: true,
    format: pct,
  },
];

/** The table ranks visitors with the bar (D-013); the drawer and the CSV keep every column. */
const SHOWN_COLUMNS: Column[] = [{ key: "visitors", header: "Visitors" }];

function toRows(t: DeviceTable, versionPrefix: string): TableRow[] {
  const numeric = (r: BreakdownMultiRow) =>
    Object.fromEntries(
      Object.entries(r)
        .filter(([k]) => k !== "value" && k !== "value2" && k !== "total")
        .map(([k, v]) => [k, v === null ? null : Number(v)])
    ) as Record<string, number | null>;
  return t.rows.map((r) => ({
    id: r.value,
    label: r.value || "Unknown",
    cells: numeric(r),
    previous: t.previous
      ? t.previous[r.value]
        ? numeric(t.previous[r.value])
        : {}
      : undefined,
    children: (t.children[r.value] ?? [])
      .filter((c) => c.value && c.value !== "0")
      .map((c) => ({
        id: `${r.value} ${c.value}`,
        label: c.value,
        childPrefix: `${r.value || "Unknown"}, ${versionPrefix}`,
        cells: { visitors: c.visitors, pageviews: null, bounce_rate: null },
      })),
  }));
}

/** Browsers and operating systems with versions as sub-rows (design §8.6). */
export function DevicesTables({
  compare,
  hasFilters,
  browsers,
  systems,
}: {
  compare: boolean;
  hasFilters: boolean;
  browsers: Settled<DeviceTable>;
  systems: Settled<DeviceTable>;
}) {
  const emptyText = hasFilters
    ? "Nothing matches these filters"
    : "No visitors in this period";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 min-[1000px]:grid-cols-2">
      <Region
        region="browsers"
        title="Browsers"
        qualifier="expand a row for versions"
        data={browsers}
        compare={compare}
        emptyText={emptyText}
        versionPrefix="version"
      />
      <Region
        region="systems"
        title="Operating systems"
        qualifier="expand a row for versions"
        data={systems}
        compare={compare}
        emptyText={emptyText}
        versionPrefix="version"
      />
    </div>
  );
}

function Region({
  region,
  title,
  qualifier,
  data,
  compare,
  emptyText,
  versionPrefix,
}: {
  region: string;
  title: string;
  qualifier: string;
  data: Settled<DeviceTable>;
  compare: boolean;
  emptyText: string;
  versionPrefix: string;
}) {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const [drawer, setDrawer] = useState(false);
  if (!data.ok) return <SectionError title={title} />;
  const t = data.data;
  const rows = toRows(t, versionPrefix);
  const filter = (row: TableRow) => {
    // a version sub-row filters on the parent value; versions are not a chip dimension here
    const value = row.childPrefix ? row.id.split(" ")[0] : row.id;
    update(
      withFilter(state, { dimension: t.dimension, op: "is", values: [value] })
    );
    announce(`Added ${filterSentence(t.dimension, "is", [value])}.`);
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
          <>
            {title}{" "}
            <span className="text-[12.5px] font-normal text-mute">
              {qualifier}
            </span>
          </>
        }
        labelHeader={region === "browsers" ? "Browser" : "System"}
        columns={SHOWN_COLUMNS}
        rows={rows.slice(0, SHOWN)}
        bar="visitors"
        fill
        defaultSort={{ col: "visitors", dir: "desc" }}
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
        columns={COLUMNS}
        rows={rows.map((r) => ({ ...r, children: undefined }))}
        onPick={(row) => {
          setDrawer(false);
          filter(row);
        }}
      />
    </div>
  );
}
