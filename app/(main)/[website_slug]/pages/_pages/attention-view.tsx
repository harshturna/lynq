"use client";

import { useMemo, useState } from "react";
import type { Column, TableRow } from "@/components/shell/data-table";
import { DataTable } from "@/components/shell/data-table";
import { filterSentence } from "@/components/shell/dimensions";
import { ShowAllDrawer } from "@/components/shell/drawer";
import { SectionError } from "@/components/shell/section-error";
import { useAnnounce, useViewState } from "@/components/shell/view-state";
import { SplitBar } from "@/components/shell/views";
import { fmtDuration, fmtPct } from "@/lib/format";
import type { AttentionData } from "@/lib/screens/pages";
import type { Section as Settled } from "@/lib/screens/settle";
import { withFilter } from "@/lib/url-state";
import { attentionLead } from "./attention";
import { PAGE_VIEWS } from "./views";

const SHOWN = 12;

/** "104 hours", or minutes while a site is young. */
function fmtPool(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60_000))} minutes`;
  const n = Math.round(hours);
  return `${n.toLocaleString("en-US")} ${n === 1 ? "hour" : "hours"}`;
}

const time: Column["format"] = (v) =>
  v === null ? "—" : fmtDuration(Number(v));
const pct: Column["format"] = (v) =>
  v === null ? "—" : `${Math.round(Number(v))}%`;
const lift: Column["format"] = (v) =>
  v === null ? "—" : `${Number(v).toFixed(2)}×`;

/**
 * The Attention view (D-016): the pool of attention the site earned, split
 * across the pages that hold it, then ranked. Share leads the table because
 * a percentage explains itself; the duration supports it.
 */
export function AttentionView({
  data,
  rangeLabel,
}: {
  data: Settled<AttentionData>;
  /** "this month", "in the last 7 days": the pool needs a period. */
  rangeLabel: string;
}) {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const [drawer, setDrawer] = useState(false);

  const columns = useMemo<Column[]>(
    () => [
      // "Share of attention" is spelled out in the lead above; a long header
      // here costs the label column its width on a phone.
      {
        key: "share",
        header: "Share",
        format: (v) => (v === null ? "—" : fmtPct(Number(v), 1)),
      },
      { key: "attention_ms", header: "Time", format: time, secondary: true },
      {
        key: "read_through",
        header: "Read-through",
        format: pct,
        secondary: true,
      },
      { key: "lift", header: "Influence", format: lift, sortable: false },
    ],
    []
  );

  if (!data.ok) return <SectionError title="Attention" />;
  const d = data.data;
  const lead = attentionLead(d.rows, d.siteAttentionMs);
  const rows: TableRow[] = d.rows.map((r) => ({
    id: r.value,
    label: r.value,
    cells: {
      share: d.siteAttentionMs
        ? (r.attention_ms / d.siteAttentionMs) * 100
        : null,
      attention_ms: r.attention_ms,
      read_through: r.read_through,
      lift: r.lift,
    },
  }));
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
      {lead && (
        <div className="mb-8">
          <p className="mb-[10px] text-[13px] text-mute">
            <b className="mr-[6px] text-[26px] font-medium tracking-[-0.02em] text-ink tabular">
              {fmtPool(lead.totalMs)}
            </b>
            of attention {rangeLabel}
          </p>
          <SplitBar
            title="Where the attention goes"
            segments={lead.segments}
            format={(v) => fmtDuration(v)}
            ramp
          />
          <p className="mt-3 max-w-[70ch] text-[13.5px] text-ink-2">
            The {lead.topCount === 1 ? "page" : `${lead.topCount} pages`} above
            hold{" "}
            <b className="font-medium text-ink">{lead.topShare.toFixed(0)}%</b>{" "}
            of it. <b className="font-medium text-ink">{lead.leader.path}</b>{" "}
            alone holds {fmtDuration(lead.leader.ms)},{" "}
            {lead.leader.share.toFixed(0)}% of everything
            {lead.leader.read !== null && (
              <>
                , and is read to the end {Math.round(lead.leader.read)}% of the
                time
              </>
            )}
            .
          </p>
        </div>
      )}
      <DataTable
        region="pages"
        title="Pages"
        labelHeader="Page"
        views={PAGE_VIEWS}
        defaultView="all"
        columns={columns}
        rows={rows.slice(0, SHOWN)}
        defaultSort={{ col: "share", dir: "desc" }}
        onFilter={filter}
        total={d.total}
        onShowAll={rows.length > SHOWN ? () => setDrawer(true) : undefined}
        exportName="pages-attention"
        emptyText="No attention recorded yet"
        // no previous-period figures for these metrics yet, so the change
        // column would be a row of em dashes (TICKET-084 follow-up)
        compare={false}
      />
      <ShowAllDrawer
        open={drawer}
        onOpenChange={setDrawer}
        title="Pages · Attention"
        columns={columns}
        rows={rows}
      />
    </div>
  );
}
