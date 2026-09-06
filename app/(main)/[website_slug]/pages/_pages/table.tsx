"use client";

import { useMemo, useState } from "react";
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
import { fmtDuration, fmtPct, fmtRevenue } from "@/lib/format";
import { globToRegExp } from "@/lib/ingest/glob";
import type { Granularity } from "@/lib/query/ranges";
import type { Kpi } from "@/lib/screens/kpi";
import type {
  PagesTable as PagesTableData,
  PagesView,
} from "@/lib/screens/pages";
import type { Section as Settled } from "@/lib/screens/settle";
import { withFilter, withParam } from "@/lib/url-state";
import { AttentionLine } from "./attention-line";
import { PAGE_VIEWS } from "./views";

const SHOWN = 12;

const pct: Column["format"] = (v) => (v === null ? "—" : fmtPct(Number(v)));
const dur: Column["format"] = (v) =>
  v === null ? "—" : fmtDuration(Number(v));

/** Zero is an em dash, so an empty column does not read as a measured zero. */
const money: Column["format"] = (v) =>
  v === null || Number(v) === 0 ? "—" : fmtRevenue(Number(v));
/** Computed from the row's own cells, like the Locations share column. */
const perVisitor: Column["format"] = (_, row) => {
  const revenue = Number(row.cells.revenue ?? 0);
  const visitors = Number(row.cells.visitors ?? 0);
  return revenue === 0 || !visitors ? "—" : fmtRevenue(revenue / visitors);
};

const REVENUE: Column = { key: "revenue", header: "Revenue", format: money };
const PER_VISITOR: Column = {
  key: "revenue_per_visitor",
  header: "Rev / visitor",
  sortable: false,
  format: perVisitor,
};

/** The full set, for the drawer and the CSV. */
function columnsFor(view: PagesView, kpi: Kpi): Column[] {
  const bounce: Column = {
    key: "bounce_rate",
    header: "Bounce",
    lowerIsBetter: true,
    points: true,
    format: pct,
    secondary: true,
  };
  const engaged: Column = {
    key: "engaged_time",
    header: "Engaged",
    format: dur,
    secondary: true,
  };
  if (view !== "all")
    return [
      { key: "sessions", header: "Sessions" },
      { key: "visitors", header: "Visitors" },
      bounce,
      engaged,
      // entry only: see viewsFor() in lib/screens/pages.ts
      ...(kpi.hasRevenue && view === "entry" ? [REVENUE, PER_VISITOR] : []),
    ];
  return [
    { key: "visitors", header: "Visitors" },
    { key: "pageviews", header: "Pageviews" },
    bounce,
    engaged,
  ];
}

/** What the table shows: at most four numeric columns (D-013). */
function shownFor(view: PagesView, kpi: Kpi): Column[] {
  const all = columnsFor(view, kpi);
  if (view !== "entry" || !kpi.hasRevenue) return all;
  // Revenue cannot be compared across rows on its own, so the per-visitor
  // column earns its place and Visitors and Engaged move to the drawer.
  const by = (key: string) => all.find((c) => c.key === key) as Column;
  return [by("sessions"), REVENUE, PER_VISITOR, by("bounce_rate")];
}

/** The attention line (D-011), the search box and the table (design §8.3). */
export function PagesTable({
  slug: _slug,
  view,
  kpi,
  compare,
  hasFilters,
  table,
}: {
  slug: string;
  view: PagesView;
  kpi: Kpi;
  compare: boolean;
  hasFilters: boolean;
  granularity: Granularity;
  timezone: string;
  table: Settled<PagesTableData>;
}) {
  const { state, update, pending } = useViewState();
  const announce = useAnnounce();
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(false);
  const columns = useMemo(() => columnsFor(view, kpi), [view, kpi]);
  const shown = useMemo(() => shownFor(view, kpi), [view, kpi]);
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
        <DataTable
          region="pages"
          title="Pages"
          labelHeader="Page"
          caption={
            <label className="flex items-center gap-2 text-[12.5px] text-mute">
              <span className="sr-only">Search paths</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search paths, e.g. /docs/*"
                className="h-[26px] w-[160px] rounded-control sm:w-[220px] border border-rule px-2 text-[12.5px] font-normal text-ink placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal"
              />
            </label>
          }
          views={PAGE_VIEWS}
          defaultView="all"
          columns={shown}
          rows={matched.slice(0, SHOWN)}
          defaultSort={{ col: shown[0].key, dir: "desc" }}
          selectedId={state.sel}
          onSelect={select}
          onFilter={filter}
          total={search ? matched.length : t.total}
          onShowAll={matched.length > SHOWN ? () => setDrawer(true) : undefined}
          exportName={`pages-${view}`}
          emptyText={search ? "No paths match" : emptyText}
          compare={compare}
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
