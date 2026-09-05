"use client";

import Link from "next/link";
import {
  Fragment,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { downloadCsv, toCsv } from "@/lib/csv";
import { toQuery, withSort, withView } from "@/lib/url-state";
import { cn } from "@/lib/utils";
import { ChangeSlot } from "./badge";
import { useAnnounce, useViewState } from "./view-state";

/**
 * The table (design §6). Real `<table>`, fixed layout, first column ellipsised,
 * numbers right-aligned in tabular figures. Every header carries aria-sort and
 * a button named with the next action; the segmented caption is a tablist of
 * links writing `view.<region>`; the selected row is aria-current; rows are
 * one Tab stop with roving focus on the first cell's button: arrows move,
 * Enter is the row's primary action (select or filter, the screen decides),
 * F or Shift+Enter filters; the Filter button in the last cell appears on
 * hover or focus. When compare is on every number gets a change slot beside
 * it, never inside its cell (D-010). `lead` shows one ranked column with a
 * share bar behind the label and a Details link to the full drawer.
 */
export type Column = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  width?: string;
  /** Hidden under 1000 px; still in the drawer and the CSV. */
  secondary?: boolean;
  sortable?: boolean;
  /** Lower is better for the delta colour (bounce rate). */
  lowerIsBetter?: boolean;
  /** A rate: the change is in points, not a relative percentage. */
  points?: boolean;
  /** Format a raw cell value; default formats numbers with separators. */
  format?: (value: string | number | null, row: TableRow) => ReactNode;
};

export type TableRow = {
  id: string;
  /** The first column, as displayed. */
  label: ReactNode;
  cells: Record<string, string | number | null>;
  /** Previous-period values per column key, shown as deltas when compare is on. */
  previous?: Record<string, number | null>;
  children?: TableRow[];
  /** Screen-reader prefix for a child row ("Chrome, version"). */
  childPrefix?: string;
};

export type ViewOption = { key: string; label: string };

const fmt = (v: string | number | null) =>
  typeof v === "number" ? v.toLocaleString("en-US") : (v ?? "—");

/**
 * The row button's name: prefix for a child row, the label, and the actions.
 * An explicit label because an sr-only prefix span loses its trailing space in
 * the accessible-name computation ("Chrome, version128").
 */
function rowName(row: TableRow, canSelect: boolean, canFilter: boolean) {
  const label = typeof row.label === "string" ? row.label : row.id;
  const prefix = row.childPrefix ? `${row.childPrefix} ` : "";
  const action = canSelect ? "select" : "filter";
  const extra = canSelect && canFilter ? ", F to filter" : "";
  return `${prefix}${label}, press Enter to ${action}${extra}`;
}

export function DataTable({
  region,
  title,
  columns,
  rows,
  views,
  defaultView,
  defaultSort,
  selectedId,
  onSelect,
  onFilter,
  filterLabel = "Filter",
  total,
  onShowAll,
  exportName,
  emptyText = "No data for this period",
  compare = false,
  lead,
  className,
}: {
  region: string;
  title?: ReactNode;
  columns: Column[];
  rows: TableRow[];
  views?: ViewOption[];
  defaultView?: string;
  defaultSort?: { col: string; dir: "asc" | "desc" };
  selectedId?: string;
  onSelect?: (row: TableRow) => void;
  onFilter?: (row: TableRow) => void;
  filterLabel?: string;
  total?: number;
  onShowAll?: () => void;
  exportName?: string;
  emptyText?: string;
  compare?: boolean;
  /** Show only this column, ranked, with a share bar and a Details link (D-010). */
  lead?: string;
  className?: string;
}) {
  const { state, update } = useViewState();
  const announce = useAnnounce();
  const sort = state.sort[region] ?? defaultSort;
  const activeView = state.view[region] ?? defaultView ?? views?.[0]?.key;
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const shown = useMemo(
    () => (lead ? columns.filter((c) => c.key === lead) : columns),
    [columns, lead]
  );
  const leadMax = useMemo(
    () =>
      lead
        ? Math.max(1, ...rows.map((r) => Number(r.cells[lead] ?? 0) || 0))
        : 1,
    [rows, lead]
  );
  const hasHeader = Boolean(title || views);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.dir === "asc" ? 1 : -1;
    const val = (r: TableRow) =>
      sort.col === "label" ? r.id : r.cells[sort.col];
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x < y ? -1 : 1) * dir;
    });
  }, [rows, sort]);

  const flat = useMemo(
    () =>
      sorted.flatMap((r) =>
        expanded.has(r.id) && r.children ? [r, ...r.children] : [r]
      ),
    [sorted, expanded]
  );
  const focusId =
    focusedId && flat.some((r) => r.id === focusedId)
      ? focusedId
      : (flat[0]?.id ?? null);

  useEffect(() => {
    if (!focusedId) return;
    tbodyRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-row="${CSS.escape(focusedId)}"]`
      )
      ?.focus();
  }, [focusedId]);

  const toggleSort = (col: Column) => {
    const next: "asc" | "desc" =
      sort?.col === col.key && sort.dir === "desc" ? "asc" : "desc";
    update(withSort(state, region, col.key, next), { replace: true });
    announce(
      `Sorted by ${col.header}, ${next === "desc" ? "descending" : "ascending"}.`
    );
  };

  const primary = (row: TableRow) =>
    onSelect ? onSelect(row) : onFilter?.(row);

  const onRowKey = (e: KeyboardEvent, row: TableRow) => {
    const i = flat.findIndex((r) => r.id === row.id);
    const go = (n: number) => {
      e.preventDefault();
      setFocusedId(flat[Math.max(0, Math.min(flat.length - 1, n))].id);
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(flat.length - 1);
    else if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      onFilter?.(row);
    } else if (e.key === "Enter") {
      e.preventDefault();
      primary(row);
    } else if ((e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onFilter?.(row);
    }
  };

  const exportCsv = () => {
    const cols = [
      { key: "label", header: "Value" },
      ...columns.map((c) => ({ key: c.key, header: c.header })),
    ];
    downloadCsv(
      exportName ?? region,
      toCsv(
        cols,
        rows.map((r) => ({ label: r.id, ...r.cells }))
      )
    );
  };

  const ariaSort = (c: Column) =>
    sort?.col === c.key
      ? sort.dir === "asc"
        ? "ascending"
        : "descending"
      : "none";
  const nextSortLabel = (c: Column) =>
    sort?.col === c.key
      ? `${c.header}, sorted ${sort.dir === "asc" ? "ascending" : "descending"}, activate to sort ${sort.dir === "asc" ? "descending" : "ascending"}`
      : `${c.header}, not sorted, activate to sort descending`;

  return (
    <div className={cn("min-w-0", className)}>
      {hasHeader && (
        <div className="flex items-end gap-3 border-b border-rule-strong text-[14px] font-medium text-ink">
          {title && (
            <h3 className="pb-[7px] text-[14px] font-medium">{title}</h3>
          )}
          {views && views.length > 1 && (
            <div
              role="tablist"
              aria-label={`${typeof title === "string" ? title : region} view`}
              className="-mb-px flex gap-3"
            >
              {views.map((v) => {
                const on = v.key === activeView;
                return (
                  <Link
                    key={v.key}
                    role="tab"
                    aria-selected={on}
                    href={toQuery(withView(state, region, v.key)) || "?"}
                    scroll={false}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                      e.preventDefault();
                      update(withView(state, region, v.key), { replace: true });
                    }}
                    className={cn(
                      "border-b-2 border-transparent pb-[6px] text-[12.5px] font-normal text-mute hover:text-ink",
                      on && "border-teal text-ink"
                    )}
                  >
                    {v.label}
                  </Link>
                );
              })}
            </div>
          )}
          {lead && onShowAll && (
            <button
              type="button"
              onClick={onShowAll}
              className="ml-auto pb-[7px] text-[12px] font-medium text-teal-ink hover:underline"
            >
              Details →
            </button>
          )}
        </div>
      )}
      <section
        aria-label={typeof title === "string" ? title : region}
        tabIndex={0}
        className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        <table className="w-full table-auto border-collapse text-[13px]">
          <thead>
            <tr>
              <th
                scope="col"
                className={cn(
                  "w-full max-w-0 border-b border-rule py-2 text-left text-[11.5px] font-medium tracking-[0.02em] text-mute",
                  !hasHeader && "border-t border-t-rule-strong"
                )}
              >
                <SortButton
                  active={sort?.col === "label"}
                  label={
                    sort?.col === "label"
                      ? nextSortLabel({ key: "label", header: "Value" })
                      : "Value, not sorted, activate to sort descending"
                  }
                  onClick={() => toggleSort({ key: "label", header: "Value" })}
                >
                  {shown.length ? "" : "Value"}
                </SortButton>
              </th>
              {shown.map((c, i) => (
                <Fragment key={c.key}>
                  <th
                    scope="col"
                    aria-sort={c.sortable === false ? undefined : ariaSort(c)}
                    style={
                      c.width
                        ? ({ "--w": c.width } as React.CSSProperties)
                        : undefined
                    }
                    className={cn(
                      "whitespace-nowrap border-b border-rule py-2 pl-3 text-[11.5px] font-medium tracking-[0.02em] text-mute min-[1000px]:w-[var(--w)]",
                      !hasHeader && "border-t border-t-rule-strong",
                      c.align === "right"
                        ? "text-right"
                        : c.align === "center"
                          ? "text-center"
                          : "text-left",
                      c.secondary && !lead && "hidden min-[1000px]:table-cell"
                    )}
                  >
                    {c.sortable === false ? (
                      c.header
                    ) : (
                      <SortButton
                        active={sort?.col === c.key}
                        label={nextSortLabel(c)}
                        onClick={() => toggleSort(c)}
                        align={c.align}
                      >
                        {c.header}
                      </SortButton>
                    )}
                  </th>
                  {compare && (
                    <th
                      scope="col"
                      className={cn(
                        "w-[64px] whitespace-nowrap border-b border-rule py-2 pl-3 text-left text-[11.5px] font-normal text-faint",
                        !hasHeader && "border-t border-t-rule-strong",
                        c.secondary && !lead && "hidden min-[1000px]:table-cell"
                      )}
                    >
                      {i === 0 ? (
                        "vs prev"
                      ) : (
                        <span className="sr-only">change</span>
                      )}
                    </th>
                  )}
                </Fragment>
              ))}
              <th
                scope="col"
                className={cn(
                  "w-[36px] border-b border-rule",
                  !hasHeader && "border-t border-t-rule-strong"
                )}
              >
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {flat.length === 0 && (
              <tr>
                <td
                  colSpan={shown.length * (compare ? 2 : 1) + 2}
                  className="py-8 text-center text-[13px] text-mute"
                >
                  {emptyText}
                </td>
              </tr>
            )}
            {flat.map((row) => {
              const isChild = Boolean(row.childPrefix);
              const parent =
                !isChild && row.children && row.children.length > 0;
              const selected = row.id === selectedId;
              return (
                <tr
                  key={row.id}
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "group border-b border-rule",
                    selected && "bg-teal-soft/60",
                    isChild && "text-[12.5px]"
                  )}
                >
                  <td
                    className={cn(
                      "relative w-full max-w-0 truncate text-ink",
                      lead ? "py-[9px]" : "py-[7px]",
                      isChild && "pl-[18px] text-ink-2"
                    )}
                  >
                    {lead && !isChild && (
                      <span
                        aria-hidden
                        className="absolute inset-y-[6px] left-0 rounded-[3px] bg-teal-soft opacity-80"
                        style={{
                          width: `${Math.min(100, ((Number(row.cells[lead] ?? 0) || 0) / leadMax) * 100)}%`,
                        }}
                      />
                    )}
                    {parent && (
                      <button
                        type="button"
                        aria-expanded={expanded.has(row.id)}
                        aria-label={`${expanded.has(row.id) ? "Collapse" : "Expand"} ${row.id}`}
                        onClick={() =>
                          setExpanded((s) => {
                            const n = new Set(s);
                            if (n.has(row.id)) n.delete(row.id);
                            else n.add(row.id);
                            return n;
                          })
                        }
                        className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-chip text-[11px] text-mute hover:bg-soft"
                      >
                        {expanded.has(row.id) ? "▾" : "▸"}
                      </button>
                    )}
                    <button
                      type="button"
                      data-row={row.id}
                      tabIndex={row.id === focusId ? 0 : -1}
                      onFocus={() => setFocusedId(row.id)}
                      onKeyDown={(e) => onRowKey(e, row)}
                      onClick={() => primary(row)}
                      aria-current={selected ? "true" : undefined}
                      aria-label={rowName(
                        row,
                        Boolean(onSelect),
                        Boolean(onFilter)
                      )}
                      className={cn(
                        "relative max-w-full truncate rounded-chip text-left align-middle",
                        lead && "pl-2",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
                        selected &&
                          "font-medium text-teal-ink underline decoration-teal underline-offset-[3px]"
                      )}
                    >
                      {row.label}
                    </button>
                  </td>
                  {shown.map((c) => {
                    const v = row.cells[c.key] ?? null;
                    const prev = compare ? row.previous?.[c.key] : undefined;
                    const hidden =
                      c.secondary && !lead && "hidden min-[1000px]:table-cell";
                    return (
                      <Fragment key={c.key}>
                        <td
                          className={cn(
                            "whitespace-nowrap pl-3 tabular",
                            lead
                              ? "py-[9px] text-[13.5px] text-ink"
                              : "py-[7px] text-ink-2",
                            c.align === "right"
                              ? "text-right"
                              : c.align === "center"
                                ? "text-center"
                                : "text-left",
                            hidden
                          )}
                        >
                          {c.format ? c.format(v, row) : fmt(v)}
                        </td>
                        {compare && (
                          <td
                            className={cn(
                              "w-[64px] whitespace-nowrap pl-3 text-left text-[11.5px] text-mute tabular",
                              hidden
                            )}
                          >
                            {typeof v === "number" ? (
                              <ChangeSlot
                                current={v}
                                previous={prev}
                                lowerIsBetter={c.lowerIsBetter}
                                points={c.points}
                              />
                            ) : (
                              <span className="text-faint">—</span>
                            )}
                          </td>
                        )}
                      </Fragment>
                    );
                  })}
                  <td className="py-[3px] text-right">
                    {onFilter && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`${filterLabel} by ${row.id}`}
                        onClick={() => onFilter(row)}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-chip text-mute opacity-0 transition-opacity",
                          "group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-soft hover:text-ink focus:opacity-100"
                        )}
                      >
                        <svg
                          aria-hidden
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path
                            d="M1.5 2.5h11l-4.2 5v4l-2.6 1v-5z"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      {(total !== undefined || onShowAll || exportName) && (
        <div className="flex items-center gap-2 pt-[10px] text-[12px] text-mute">
          {total !== undefined && (
            <span>
              {total.toLocaleString("en-US")} {total === 1 ? "row" : "rows"}
            </span>
          )}
          {onShowAll && !lead && (
            <>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={onShowAll}
                className="font-medium text-teal-ink hover:underline"
              >
                Show all
              </button>
            </>
          )}
          {exportName && (
            <>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={exportCsv}
                className="font-medium text-teal-ink hover:underline"
              >
                Export CSV
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SortButton({
  active,
  label,
  onClick,
  align,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  align?: "left" | "right" | "center";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-chip hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
        align === "right" && "flex-row-reverse",
        active && "text-ink"
      )}
    >
      <span>{children}</span>
      {active && (
        <span aria-hidden className="text-teal">
          ▾
        </span>
      )}
    </button>
  );
}
