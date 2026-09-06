"use client";

import { useMemo, useState } from "react";
import { Sparkline, trendLabel } from "@/components/charts/charts";
import {
  type Column,
  DataTable,
  type TableRow,
} from "@/components/shell/data-table";
import { filterSentence } from "@/components/shell/dimensions";
import { ShowAllDrawer } from "@/components/shell/drawer";
import { SectionError } from "@/components/shell/section-error";
import { useAnnounce, useViewState } from "@/components/shell/view-state";
import { fmtAgo } from "@/lib/format";
import type { EventsTable as EventsTableData } from "@/lib/screens/events";
import type { Section as Settled } from "@/lib/screens/settle";
import { withFilter, withParam } from "@/lib/url-state";

const SHOWN = 12;

/** The events table (design §8.7): count, visitors, "1 in N sessions", last seen, trend. */
export function EventsTable({
  compare,
  hasFilters,
  table,
  trends,
}: {
  compare: boolean;
  hasFilters: boolean;
  table: Settled<EventsTableData>;
  trends: Record<string, number[]>;
}) {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const [drawer, setDrawer] = useState(false);
  const columns = useMemo<Column[]>(() => {
    const sessions = table.ok ? table.data.sessions : 0;
    return [
      { key: "custom_events", header: "Count", align: "right", width: "90px" },
      {
        key: "visitors",
        header: "Visitors",
        align: "right",
        width: "90px",
        secondary: true,
      },
      {
        key: "sessions",
        header: "Frequency",
        align: "right",
        width: "130px",
        format: (v) => {
          const n = Number(v ?? 0);
          if (!n || !sessions) return "—";
          const per = Math.max(1, Math.round(sessions / n));
          return per === 1
            ? "every session"
            : `1 in ${per.toLocaleString("en-US")} sessions`;
        },
      },
      {
        key: "last_seen",
        header: "Last seen",
        align: "right",
        width: "110px",
        sortable: false,
        secondary: true,
        format: (v) => (v ? fmtAgo(new Date(String(v))) : "—"),
      },
      {
        key: "trend",
        header: "Trend",
        align: "right",
        width: "84px",
        sortable: false,
        secondary: true,
        format: (_, row) => {
          const values = trends[row.id];
          return values ? (
            <Sparkline
              values={values}
              label={trendLabel(values)}
              accent={row.id === state.sel}
            />
          ) : null;
        },
      },
    ];
  }, [table, trends, state.sel]);
  const rows = useMemo<TableRow[]>(() => {
    if (!table.ok) return [];
    const t = table.data;
    const numeric = (r: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(r)
          .filter(
            ([k]) => !["value", "value2", "total", "last_seen"].includes(k)
          )
          .map(([k, v]) => [k, v === null ? null : Number(v)])
      ) as Record<string, number | null>;
    return t.rows.map((r) => ({
      id: r.value,
      label: r.value,
      cells: {
        ...numeric(r),
        last_seen: (r.last_seen as string | null) ?? null,
      },
      previous: t.previous
        ? t.previous[r.value]
          ? numeric(t.previous[r.value])
          : {}
        : undefined,
    }));
  }, [table]);
  if (!table.ok) return <SectionError title="Events" strong />;
  const select = (row: TableRow) =>
    update(withParam(state, "sel", row.id), { replace: true });
  const filter = (row: TableRow) => {
    update(
      withFilter(state, { dimension: "event_name", op: "is", values: [row.id] })
    );
    announce(`Added ${filterSentence("event_name", "is", [row.id])}.`);
  };
  return (
    <div
      aria-busy={pending}
      className={
        pending ? "opacity-70 transition-opacity" : "transition-opacity"
      }
    >
      <DataTable
        region="events"
        title="Events"
        columns={columns}
        rows={rows.slice(0, SHOWN)}
        defaultSort={{ col: "custom_events", dir: "desc" }}
        selectedId={state.sel}
        onSelect={select}
        onFilter={filter}
        total={table.data.total}
        onShowAll={rows.length > SHOWN ? () => setDrawer(true) : undefined}
        exportName="events"
        emptyText={
          hasFilters
            ? "Nothing matches these filters"
            : "No events yet. Track one with lynq.track('signup')."
        }
        compare={compare}
      />
      <ShowAllDrawer
        open={drawer}
        onOpenChange={setDrawer}
        title="Events"
        columns={columns.filter((c) => c.key !== "trend")}
        rows={rows}
        onPick={(row) => {
          setDrawer(false);
          select(row);
        }}
      />
    </div>
  );
}
