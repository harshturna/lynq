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
import { ChangeSlot, Pill, type PillStatus } from "./badge";
import { useAnnounce, useViewState } from "./view-state";

/**
 * The table (design §6, D-013). A real `<table>` that hugs the left and ends
 * where its columns end (or fills its column with `fill`); the label column is
 * 220 to 320 px and ellipsised. One primary column, the sorted metric unless
 * `primary` says otherwise: ink at medium weight, the only dark header, and the
 * only change slot when compare is on. Other numbers are ink-2 and plain. The
 * share bar, when `bar` names a column, is a 6 px bar in its own column right
 * after the label. Status is a pill in its own slot, only when it is not good.
 * Every header carries aria-sort and a button named with the next action; the
 * caption's views are a tablist of links writing `view.<region>`; the selected
 * row is aria-current; rows are one Tab stop with roving focus: arrows move,
 * Enter is the row's primary action (select or filter), F or Shift+Enter
 * filters; the Filter button in the last cell appears on hover or focus.
 */
export type Column = {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  width?: string;
  /** Hidden under 1000 px; still in the drawer and the CSV. */
  secondary?: boolean;
  sortable?: boolean;
  /** Lower is better for the change colour (bounce rate). */
  lowerIsBetter?: boolean;
  /** A rate: the change is in points, not a relative percentage. */
  points?: boolean;
  /** Format a raw cell value; default formats numbers with separators. */
  format?: (value: string | number | null, row: TableRow) => ReactNode;
  /** A status for the cell; "good" and null render nothing, the rest a pill after the number. */
  status?: (value: string | number | null, row: TableRow) => PillStatus | null;
  statusLabel?: (status: PillStatus) => string;
};

export type TableRow = {
  id: string;
  /** The first column, as displayed. */
  label: ReactNode;
  cells: Record<string, string | number | null>;
  /** Previous-period values per column key, shown as the change when compare is on. */
  previous?: Record<string, number | null>;
  children?: TableRow[];
  /** Screen-reader prefix for a child row ("Chrome, version"). */
  childPrefix?: string;
};

export type ViewOption = { key: string; label: string };

const fmt = (v: string | number | null) =>
  typeof v === "number" ? v.toLocaleString("en-US") : (v ?? "—");

const STATUS_LABEL: Record<PillStatus, string> = {
  good: "Good",
  warn: "Needs work",
  poor: "Poor",
  none: "",
};

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
  labelHeader,
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
  primary,
  bar,
  fill = false,
  caption,
  className,
}: {
  region: string;
  title?: ReactNode;
  /** The label column's header ("Page"); defaults to the title. */
  labelHeader?: string;
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
  /** The column in ink with the change slot; defaults to the sorted column. */
  primary?: string;
  /** The column whose share of the largest row fills the bar column. */
  bar?: string;
  /** Fill the container's width (half-width tables); otherwise hug the left. */
  fill?: boolean;
  /** Something for the right end of the caption rule, such as a search box. */
  caption?: ReactNode;
  className?: string;
}) {
  const { state, update } = useViewState();
  const labelCol: Column = {
    key: "label",
    header: labelHeader ?? (typeof title === "string" ? title : "Value"),
  };
  const announce = useAnnounce();
  const sort = state.sort[region] ?? defaultSort;
  const activeView = state.view[region] ?? defaultView ?? views?.[0]?.key;
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const primaryKey =
    primary ??
    (sort && columns.some((c) => c.key === sort.col)
      ? sort.col
      : columns[0]?.key);
  const barMax = useMemo(
    () =>
      bar ? Math.max(1, ...rows.map((r) => Number(r.cells[bar] ?? 0) || 0)) : 1,
    [rows, bar]
  );
  const hasHeader = Boolean(title || views || caption);
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

  const primaryAction = (row: TableRow) =>
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
      primaryAction(row);
    } else if ((e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onFilter?.(row);
    }
  };

  const exportCsv = () => {
    const cols = [
      labelCol,
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

  // The first column after the primary group sits a little further away.
  const afterPrimary = columns.findIndex((c) => c.key === primaryKey) + 1;
  const hidden = (c: Column) =>
    c.secondary ? "hidden min-[1000px]:table-cell" : undefined;
  const thBase = cn(
    "whitespace-nowrap border-b border-rule pb-2 pt-[10px] text-[11.5px] font-medium tracking-[0.02em]",
    !hasHeader && "border-t border-t-rule-strong"
  );
  const numeric = (c: Column, i: number) =>
    cn(
      i === afterPrimary ? "pl-11" : "pl-7",
      c.align === "left"
        ? "text-left"
        : c.align === "center"
          ? "text-center"
          : "text-right"
    );
  const slots = columns.filter((c) => c.status).length + (compare ? 1 : 0);

  return (
    <div className={cn("min-w-0", className)}>
      {hasHeader && (
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1 border-b border-rule-strong text-[14px] font-medium text-ink">
          {title && (
            <h2 className="pb-[7px] text-[14px] font-medium">{title}</h2>
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
          {caption && <div className="ml-auto pb-[5px]">{caption}</div>}
        </div>
      )}
      <section
        aria-label={typeof title === "string" ? title : region}
        tabIndex={0}
        className="relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        <table
          className={cn(
            "border-collapse text-[13px]",
            fill ? "w-full" : "w-auto max-w-full"
          )}
        >
          <thead>
            <tr>
              <th
                scope="col"
                className={cn(
                  thBase,
                  "text-left text-mute",
                  fill
                    ? bar
                      ? "w-[56%] max-w-0 max-[479px]:w-full"
                      : "w-full max-w-0"
                    : "min-w-[220px] max-w-[320px]"
                )}
              >
                <SortButton
                  active={sort?.col === "label"}
                  label={nextSortLabel(labelCol)}
                  onClick={() => toggleSort(labelCol)}
                >
                  {labelCol.header}
                </SortButton>
              </th>
              {bar && (
                <th
                  scope="col"
                  className={cn(
                    thBase,
                    "max-[479px]:hidden",
                    fill ? "w-[30%]" : "w-[140px]"
                  )}
                >
                  <span className="sr-only">Share</span>
                </th>
              )}
              {columns.map((c, i) => (
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
                      thBase,
                      numeric(c, i),
                      "min-[1000px]:w-[var(--w)]",
                      c.key === primaryKey ? "text-ink" : "text-mute",
                      hidden(c)
                    )}
                  >
                    {c.sortable === false ? (
                      c.header
                    ) : (
                      <SortButton
                        active={sort?.col === c.key}
                        label={nextSortLabel(c)}
                        onClick={() => toggleSort(c)}
                        align={c.align ?? "right"}
                      >
                        {c.header}
                      </SortButton>
                    )}
                  </th>
                  {c.status && (
                    <th
                      scope="col"
                      className={cn(thBase, "w-[84px] pl-2", hidden(c))}
                    >
                      <span className="sr-only">{c.header} status</span>
                    </th>
                  )}
                  {compare && c.key === primaryKey && (
                    <th
                      scope="col"
                      className={cn(
                        thBase,
                        "w-[64px] pl-3 text-right font-normal text-mute",
                        hidden(c)
                      )}
                    >
                      change
                    </th>
                  )}
                </Fragment>
              ))}
              <th scope="col" className={cn(thBase, "w-[36px]")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody ref={tbodyRef}>
            {flat.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + slots + (bar ? 3 : 2)}
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
                    "group h-10 border-b border-rule transition-colors hover:bg-soft",
                    selected && "bg-teal-bar",
                    isChild && "text-[12.5px]"
                  )}
                >
                  <td
                    className={cn(
                      "truncate text-ink",
                      fill
                        ? bar
                          ? "w-[56%] max-w-0 max-[479px]:w-full"
                          : "w-full max-w-0"
                        : "min-w-[220px] max-w-[320px]",
                      isChild && "pl-[18px] text-ink-2"
                    )}
                  >
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
                        className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-chip text-[11px] text-mute hover:bg-soft-2"
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
                      onClick={() => primaryAction(row)}
                      aria-current={selected ? "true" : undefined}
                      aria-label={rowName(
                        row,
                        Boolean(onSelect),
                        Boolean(onFilter)
                      )}
                      className={cn(
                        "max-w-full truncate rounded-chip text-left align-middle",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal",
                        selected &&
                          "font-medium text-teal-ink underline decoration-teal underline-offset-[3px]"
                      )}
                    >
                      {row.label}
                    </button>
                  </td>
                  {bar && (
                    <td className="pl-5 max-[479px]:hidden">
                      {!isChild && (
                        <span
                          aria-hidden
                          className="block h-[6px] rounded-[2px] bg-teal-2"
                          style={{
                            width: `${Math.min(100, ((Number(row.cells[bar] ?? 0) || 0) / barMax) * 100)}%`,
                          }}
                        />
                      )}
                    </td>
                  )}
                  {columns.map((c, i) => {
                    const v = row.cells[c.key] ?? null;
                    const prev = compare ? row.previous?.[c.key] : undefined;
                    const isPrimary = c.key === primaryKey;
                    const status = c.status ? c.status(v, row) : null;
                    return (
                      <Fragment key={c.key}>
                        <td
                          className={cn(
                            "whitespace-nowrap tabular",
                            numeric(c, i),
                            isPrimary ? "font-medium text-ink" : "text-ink-2",
                            hidden(c)
                          )}
                        >
                          {c.format ? c.format(v, row) : fmt(v)}
                        </td>
                        {c.status && (
                          <td className={cn("pl-2 text-left", hidden(c))}>
                            {status &&
                              status !== "good" &&
                              status !== "none" && (
                                <Pill status={status}>
                                  {(c.statusLabel ?? ((s) => STATUS_LABEL[s]))(
                                    status
                                  )}
                                </Pill>
                              )}
                          </td>
                        )}
                        {compare && isPrimary && (
                          <td
                            className={cn(
                              "whitespace-nowrap pl-3 text-right text-[12px] text-mute tabular",
                              hidden(c)
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
                  <td className="text-right">
                    {onFilter && (
                      <button
                        type="button"
                        tabIndex={-1}
                        aria-label={`${filterLabel} by ${typeof row.label === "string" ? row.label : row.id}`}
                        onClick={() => onFilter(row)}
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-chip text-mute opacity-0 transition-opacity",
                          "group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-soft-2 hover:text-ink focus:opacity-100"
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
          {onShowAll && (
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
        <span aria-hidden className="text-[9px] text-teal">
          ▾
        </span>
      )}
    </button>
  );
}
