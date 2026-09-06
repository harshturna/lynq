"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Column, TableRow } from "./data-table";

/**
 * A side drawer (design §6): dialog semantics, the page behind inert, focus
 * to the heading, Escape closes, focus returns to the invoker. The Show all
 * variant lists every row with search; above 300 rows it virtualises as a
 * grid with aria-rowcount and aria-rowindex.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  // Drawers open programmatically (no Dialog.Trigger), so remember who opened
  // them and put focus back there on close (design §6).
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null;
  }, [open]);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/20" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-[560px] max-w-[calc(100vw-24px)] flex-col border-l border-rule bg-canvas shadow-[0_8px_24px_-12px_rgba(10,10,10,0.35)] outline-none"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus();
          }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)
              ?.querySelector<HTMLElement>("h2")
              ?.focus();
          }}
        >
          <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
            <div>
              <Dialog.Title
                tabIndex={-1}
                className="text-[16px] font-medium text-ink outline-none"
              >
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-[12.5px] text-mute">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="inline-flex h-8 w-8 items-center justify-center rounded-control text-mute hover:bg-soft hover:text-ink"
              >
                ×
              </button>
            </Dialog.Close>
          </div>
          <section
            aria-label="Drawer content"
            tabIndex={0}
            className="min-h-0 flex-1 overflow-auto px-5 py-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-teal"
          >
            {children}
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const VIRTUAL_ABOVE = 300;
const fmt = (v: string | number | null) =>
  typeof v === "number" ? v.toLocaleString("en-US") : (v ?? "—");

/** Every row of a table with search; virtualised above 300 rows. */
export function ShowAllDrawer({
  open,
  onOpenChange,
  title,
  columns,
  rows,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  columns: Column[];
  rows: TableRow[];
  onPick?: (row: TableRow) => void;
}) {
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle
      ? rows.filter((r) => r.id.toLowerCase().includes(needle))
      : rows;
  }, [rows, q]);
  const scrollRef = useRef<HTMLElement>(null);
  const virtual = visible.length > VIRTUAL_ABOVE;
  const rowVirtualizer = useVirtualizer({
    count: virtual ? visible.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 34,
    overscan: 12,
  });
  const cols = [
    // The table lays out with fixed widths, so the label needs one of its own:
    // without it a wide column set (Locations with revenue) leaves it zero
    // width and the row labels vanish (TICKET-073).
    { key: "label", header: "Value", align: "left" as const, width: "220px" },
    ...columns,
  ];

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={`${rows.length.toLocaleString("en-US")} rows`}
    >
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search"
        aria-label={`Search ${title}`}
        className="mb-3 h-8 w-full rounded-control border border-rule bg-canvas px-2 text-[13px] text-ink"
      />
      {virtual ? (
        <section
          ref={scrollRef}
          aria-label={`${title} rows`}
          tabIndex={0}
          className="max-h-[70vh] overflow-auto"
        >
          <table
            aria-rowcount={visible.length}
            aria-label={title}
            className="w-full min-w-max table-fixed border-collapse text-[13px]"
          >
            <thead className="sticky top-0 bg-canvas">
              <tr>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    style={
                      "width" in c && c.width ? { width: c.width } : undefined
                    }
                    className={cn(
                      "border-b border-rule py-2 text-[11.5px] font-medium text-mute",
                      c.align === "right" ? "text-right" : "text-left"
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const items = rowVirtualizer.getVirtualItems();
                const top = items[0]?.start ?? 0;
                const bottom =
                  rowVirtualizer.getTotalSize() - (items.at(-1)?.end ?? 0);
                return (
                  <>
                    {top > 0 && (
                      <tr aria-hidden style={{ height: top }}>
                        <td colSpan={cols.length} />
                      </tr>
                    )}
                    {items.map((item) => {
                      const r = visible[item.index];
                      return (
                        <tr
                          key={r.id}
                          aria-rowindex={item.index + 1}
                          className="border-b border-rule"
                          style={{ height: item.size }}
                        >
                          <td className="truncate text-ink">
                            {onPick ? (
                              <button
                                type="button"
                                onClick={() => onPick(r)}
                                className="max-w-full truncate rounded-chip text-left hover:underline"
                              >
                                {r.label}
                              </button>
                            ) : (
                              r.label
                            )}
                          </td>
                          {columns.map((c) => (
                            <td
                              key={c.key}
                              className={cn(
                                "text-ink-2 tabular",
                                c.align === "right" && "text-right"
                              )}
                            >
                              {c.format
                                ? c.format(r.cells[c.key] ?? null, r)
                                : fmt(r.cells[c.key] ?? null)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                    {bottom > 0 && (
                      <tr aria-hidden style={{ height: bottom }}>
                        <td colSpan={cols.length} />
                      </tr>
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
        </section>
      ) : (
        <table className="w-full min-w-max table-fixed border-collapse text-[13px]">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  style={
                    "width" in c && c.width ? { width: c.width } : undefined
                  }
                  className={cn(
                    "border-b border-rule py-2 text-[11.5px] font-medium text-mute",
                    c.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="border-b border-rule">
                <td className="truncate py-[6px] text-ink">
                  {onPick ? (
                    <button
                      type="button"
                      onClick={() => onPick(r)}
                      className="max-w-full truncate rounded-chip text-left hover:underline"
                    >
                      {r.label}
                    </button>
                  ) : (
                    r.label
                  )}
                </td>
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "py-[6px] text-ink-2 tabular",
                      c.align === "right" && "text-right"
                    )}
                  >
                    {c.format
                      ? c.format(r.cells[c.key] ?? null, r)
                      : fmt(r.cells[c.key] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={cols.length}
                  className="py-6 text-center text-mute"
                >
                  Nothing matches "{q}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </Drawer>
  );
}
