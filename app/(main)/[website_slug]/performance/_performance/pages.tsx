"use client";

import { useMemo, useState } from "react";
import type { PillStatus } from "@/components/shell/badge";
import {
  type Column,
  DataTable,
  type TableRow,
} from "@/components/shell/data-table";
import { filterSentence } from "@/components/shell/dimensions";
import { ShowAllDrawer } from "@/components/shell/drawer";
import { SectionError } from "@/components/shell/section-error";
import { useAnnounce, useViewState } from "@/components/shell/view-state";
import type { VitalPage } from "@/lib/screens/performance";
import type { Section as Settled } from "@/lib/screens/settle";
import { withFilter, withParam } from "@/lib/url-state";
import {
  fmtVital,
  RENDERED_VITALS as RENDERED,
  STATUS_TEXT,
  VITAL_LABELS,
  vitalStatus,
} from "@/lib/vitals";

const SHOWN = 12;

/** Core vitals carry a status slot; FCP and TTFB are plain (D-013). */
const CORE = new Set(["lcp", "inp", "cls"]);
const COLUMNS: Column[] = [
  ...RENDERED.map(
    (k): Column => ({
      key: k,
      header: VITAL_LABELS[k],
      lowerIsBetter: true,
      secondary: k === "fcp" || k === "ttfb",
      format: (v) => fmtVital(k, v === null ? null : Number(v)),
      ...(CORE.has(k)
        ? {
            status: (v: string | number | null) => {
              const status = vitalStatus(k, v === null ? null : Number(v));
              return status === "none" ? null : status;
            },
            statusLabel: (status: PillStatus) => STATUS_TEXT[status],
          }
        : {}),
    })
  ),
  { key: "samples", header: "Samples", secondary: true },
];

/** Pages sorted worst first; a pill only where a core vital is not good (design §8.9, D-013). */
export function VitalsPages({
  pages,
  hasFilters,
}: {
  pages: Settled<VitalPage[]>;
  hasFilters: boolean;
}) {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const [drawer, setDrawer] = useState(false);
  const rows = useMemo<TableRow[]>(
    () =>
      pages.ok
        ? pages.data.map((p) => ({
            id: p.value,
            label: p.value,
            cells: {
              lcp: p.lcp,
              inp: p.inp,
              cls: p.cls,
              fcp: p.fcp,
              ttfb: p.ttfb,
              samples: p.samples,
            },
          }))
        : [],
    [pages]
  );
  if (!pages.ok) return <SectionError title="Pages" strong />;
  const select = (row: TableRow) =>
    update(withParam(state, "sel", row.id), { replace: true });
  const filter = (row: TableRow) => {
    update(
      withFilter(state, { dimension: "path", op: "is", values: [row.id] })
    );
    announce(`Added ${filterSentence("path", "is", [row.id])}.`);
  };
  return (
    <div
      aria-busy={pending}
      className={
        pending ? "opacity-70 transition-opacity" : "transition-opacity"
      }
    >
      <DataTable
        region="perf"
        title={
          <>
            Pages{" "}
            <span className="text-[12.5px] font-normal text-mute">
              worst first · p75 per page
            </span>
          </>
        }
        labelHeader="Page"
        columns={COLUMNS}
        rows={rows.slice(0, SHOWN)}
        defaultSort={{ col: "lcp", dir: "desc" }}
        selectedId={state.sel}
        onSelect={select}
        onFilter={filter}
        total={rows.length}
        onShowAll={rows.length > SHOWN ? () => setDrawer(true) : undefined}
        exportName="performance-pages"
        emptyText={
          hasFilters
            ? "Nothing matches these filters"
            : "No vitals samples in this range"
        }
      />
      <ShowAllDrawer
        open={drawer}
        onOpenChange={setDrawer}
        title="Pages by Web Vitals"
        columns={COLUMNS}
        rows={rows}
        onPick={(row) => {
          setDrawer(false);
          select(row);
        }}
      />
    </div>
  );
}
