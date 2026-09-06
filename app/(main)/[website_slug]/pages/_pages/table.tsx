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
import { Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import { useAnnounce, useViewState } from "@/components/shell/view-state";
import { fmtDuration, fmtPct } from "@/lib/format";
import { globToRegExp } from "@/lib/ingest/glob";
import type { Granularity } from "@/lib/query/ranges";
import type {
  PagesTable as PagesTableData,
  PagesView,
} from "@/lib/screens/pages";
import type { Section as Settled } from "@/lib/screens/settle";
import { withFilter, withParam } from "@/lib/url-state";
import { AttentionLine } from "./attention-line";

const SHOWN = 12;

const pct: Column["format"] = (v) => (v === null ? "—" : fmtPct(Number(v)));
const dur: Column["format"] = (v) =>
  v === null ? "—" : fmtDuration(Number(v));

function columnsFor(
  view: PagesView,
  trends: Record<string, number[]>,
  selected: string | undefined
): Column[] {
  const bounce: Column = {
    key: "bounce_rate",
    header: "Bounce",
    align: "right",
    width: "84px",
    lowerIsBetter: true,
    points: true,
    format: pct,
  };
  const engaged: Column = {
    key: "engaged_time",
    header: "Engaged",
    align: "right",
    width: "90px",
    format: dur,
  };
  if (view !== "all")
    return [
      { key: "sessions", header: "Sessions", align: "right", width: "96px" },
      {
        key: "visitors",
        header: "Visitors",
        align: "right",
        width: "96px",
        secondary: true,
      },
      bounce,
      engaged,
    ];
  return [
    { key: "visitors", header: "Visitors", align: "right", width: "96px" },
    {
      key: "pageviews",
      header: "Pageviews",
      align: "right",
      width: "96px",
      secondary: true,
    },
    {
      key: "entries",
      header: "Entries",
      align: "right",
      width: "84px",
      secondary: true,
    },
    {
      key: "exits",
      header: "Exits",
      align: "right",
      width: "84px",
      secondary: true,
    },
    bounce,
    engaged,
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
            accent={row.id === selected}
          />
        ) : null;
      },
    },
  ];
}

/** The attention line (D-011), the search box and the table (design §8.3). */
export function PagesTable({
  slug: _slug,
  view,
  compare,
  hasFilters,
  table,
  trends,
}: {
  slug: string;
  view: PagesView;
  compare: boolean;
  hasFilters: boolean;
  granularity: Granularity;
  timezone: string;
  table: Settled<PagesTableData>;
  trends: Record<string, number[]>;
}) {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(false);
  const columns = useMemo(
    () => columnsFor(view, trends, state.sel),
    [view, trends, state.sel]
  );
  const rows = useMemo<TableRow[]>(() => {
    if (!table.ok) return [];
    const t = table.data;
    const numeric = (r: Record<string, unknown>) =>
      Object.fromEntries(
        Object.entries(r)
          .filter(([k]) => k !== "value" && k !== "value2" && k !== "total")
          .map(([k, v]) => [k, v === null ? null : Number(v)])
      ) as Record<string, number | null>;
    return t.rows.map((r) => ({
      id: r.value,
      label: r.value,
      cells: {
        ...numeric(r),
        ...(view === "all"
          ? { entries: t.entries[r.value] ?? 0, exits: t.exits[r.value] ?? 0 }
          : {}),
      },
      previous: t.previous
        ? t.previous[r.value]
          ? numeric(t.previous[r.value])
          : {}
        : undefined,
    }));
  }, [table, view]);
  const matched = useMemo(() => {
    const g = search.trim();
    if (!g) return rows;
    const re = globToRegExp(g.includes("*") || g.includes("?") ? g : `*${g}*`);
    return rows.filter((r) => re.test(r.id));
  }, [rows, search]);

  if (!table.ok) return <SectionError title="Pages" strong />;
  const t = table.data;
  const dimension = t.dimension;
  const select = (row: TableRow) =>
    update(withParam(state, "sel", row.id), { replace: true });
  const filter = (row: TableRow) => {
    update(withFilter(state, { dimension, op: "is", values: [row.id] }));
    announce(`Added ${filterSentence(dimension, "is", [row.id])}.`);
  };
  const emptyText = hasFilters
    ? "Nothing matches these filters"
    : "No pageviews in this period";

  return (
    <div
      aria-busy={pending}
      className={cn(
        "flex flex-col gap-7",
        pending ? "opacity-70 transition-opacity" : "transition-opacity"
      )}
    >
      {view === "all" && (
        <AttentionLine rows={t.rows} pageviews={t.pageviews} />
      )}
      <div>
        <div className="mb-3 flex justify-end">
          <label className="flex items-center gap-2 text-[12.5px] text-mute">
            <span className="sr-only">Search paths</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search paths, e.g. /docs/*"
              className="h-[30px] w-[240px] rounded-control border border-rule px-[10px] text-[13px] text-ink placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal"
            />
          </label>
        </div>
        <DataTable
          region="pages"
          title="Pages"
          views={[
            { key: "all", label: "All" },
            { key: "entry", label: "Entry" },
            { key: "exit", label: "Exit" },
          ]}
          defaultView="all"
          columns={columns}
          rows={matched.slice(0, SHOWN)}
          defaultSort={{ col: columns[0].key, dir: "desc" }}
          selectedId={state.sel}
          onSelect={select}
          onFilter={filter}
          total={search ? matched.length : t.total}
          onShowAll={matched.length > SHOWN ? () => setDrawer(true) : undefined}
          exportName={`pages-${view}`}
          emptyText={search ? "No paths match" : emptyText}
          compare={compare}
          changes="sorted"
        />
        <ShowAllDrawer
          open={drawer}
          onOpenChange={setDrawer}
          title={`Pages · ${view === "all" ? "All" : view === "entry" ? "Entry" : "Exit"}`}
          columns={columns.filter((c) => c.key !== "trend")}
          rows={matched}
          onPick={(row) => {
            setDrawer(false);
            select(row);
          }}
        />
      </div>
    </div>
  );
}

function cn(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
