"use client";

import * as Popover from "@radix-ui/react-popover";
import { useEffect, useId, useRef, useState } from "react";
import type { FilterOp } from "@/lib/query/filters";
import { withFilter } from "@/lib/url-state";
import { cn } from "@/lib/utils";
import { Control } from "./control";
import {
  DIMENSIONS,
  displayValue,
  filterSentence,
  OP_LABEL,
} from "./dimensions";
import { useAnnounce, useViewState } from "./view-state";

/**
 * The + Filter popover (design §6): a non-modal dialog with dimension and
 * operator selects and a value combobox fed by suggestions from the breakdown
 * for that dimension. Escape closes and returns focus to the button.
 */
/** The native selects wear the app's caret rather than the platform chrome (TICKET-089). */
const SELECT =
  "h-8 min-w-0 appearance-none rounded-control border border-rule bg-canvas pl-2 pr-7 text-[13px] text-ink";
const CARET =
  "pointer-events-none absolute bottom-[9px] right-[9px] text-[11px] text-faint";

export function FilterBuilder({
  id,
  dimensions = Object.keys(DIMENSIONS),
  suggest,
}: {
  id?: string;
  /** Dimensions offered; entry_* appear once TICKET-027 lands. */
  dimensions?: string[];
  suggest?: (dimension: string) => Promise<string[]>;
}) {
  const { state, update } = useViewState();
  const announce = useAnnounce();
  const [open, setOpen] = useState(false);
  const [dimension, setDimension] = useState(dimensions[0] ?? "path");
  const [op, setOp] = useState<FilterOp>("is");
  const [value, setValue] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [active, setActive] = useState(-1);
  const [listOpen, setListOpen] = useState(false);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !suggest) return;
    let cancelled = false;
    suggest(dimension).then((list) => {
      if (!cancelled) setOptions(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open, dimension, suggest]);

  const visible = value
    ? options
        .filter((o) =>
          displayValue(dimension, o).toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 8)
    : options.slice(0, 8);

  const add = (raw: string) => {
    const v = raw.trim();
    if (!v && op !== "is") return;
    const next = withFilter(state, { dimension, op, values: [v] });
    update(next);
    announce(`Added ${filterSentence(dimension, op, [v])}.`);
    setValue("");
    setOpen(false);
  };

  const groups = new Map<string, string[]>();
  for (const d of dimensions) {
    const g = DIMENSIONS[d]?.group ?? "Other";
    groups.set(g, [...(groups.get(g) ?? []), d]);
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Control
          id={id}
          variant="ghost"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          + Filter
        </Control>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          collisionPadding={16}
          aria-label="Add a filter"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)
              ?.querySelector<HTMLSelectElement>("select")
              ?.focus();
          }}
          className="z-50 flex w-[320px] flex-col gap-3 rounded-control border border-rule bg-canvas p-3 shadow-[0_8px_24px_-12px_rgba(10,10,10,0.25)] outline-none"
        >
          <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
            <label className="relative flex flex-col gap-1 text-[12px] text-mute">
              Dimension
              <span aria-hidden className={CARET}>
                ▾
              </span>
              <select
                value={dimension}
                onChange={(e) => {
                  setDimension(e.target.value);
                  setValue("");
                  setActive(-1);
                }}
                className={SELECT}
              >
                {[...groups].map(([g, list]) => (
                  <optgroup key={g} label={g}>
                    {list.map((d) => (
                      <option key={d} value={d}>
                        {DIMENSIONS[d]?.label ?? d}
                        {DIMENSIONS[d]?.scope === "session"
                          ? " (sessions)"
                          : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <label className="relative flex flex-col gap-1 text-[12px] text-mute">
              Operator
              <span aria-hidden className={CARET}>
                ▾
              </span>
              <select
                value={op}
                onChange={(e) => setOp(e.target.value as FilterOp)}
                className={SELECT}
              >
                {(Object.keys(OP_LABEL) as FilterOp[]).map((o) => (
                  <option key={o} value={o}>
                    {OP_LABEL[o]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="relative flex flex-col gap-1 text-[12px] text-mute">
            Value
            <input
              ref={inputRef}
              role="combobox"
              aria-expanded={listOpen && visible.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                active >= 0 ? `${listId}-${active}` : undefined
              }
              value={value}
              placeholder={
                dimension === "country" ? "CA, US, …" : "Type or pick"
              }
              onChange={(e) => {
                setValue(e.target.value);
                setListOpen(true);
                setActive(-1);
              }}
              onFocus={() => setListOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setListOpen(true);
                  setActive((a) => Math.min(a + 1, visible.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, -1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  add(active >= 0 ? visible[active] : value);
                } else if (e.key === "Escape" && listOpen) {
                  e.stopPropagation();
                  setListOpen(false);
                }
              }}
              className="h-8 rounded-control border border-rule bg-canvas px-2 text-[13px] text-ink"
            />
            <div className="sr-only" aria-live="polite">
              {listOpen
                ? `${visible.length} ${visible.length === 1 ? "result" : "results"}`
                : ""}
            </div>
            {listOpen && visible.length > 0 && (
              <div
                id={listId}
                role="listbox"
                aria-label="Suggestions"
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-[200px] overflow-auto rounded-control border border-rule bg-canvas p-1 shadow-[0_8px_24px_-12px_rgba(10,10,10,0.25)]"
              >
                {visible.map((o, i) => (
                  // biome-ignore lint/a11y/useKeyWithClickEvents: keyboard selection is handled by the combobox input
                  <div
                    key={o}
                    id={`${listId}-${i}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => add(o)}
                    className={cn(
                      "cursor-pointer rounded-chip px-2 py-[5px] text-[13px] text-ink-2",
                      i === active && "bg-soft text-ink"
                    )}
                  >
                    {displayValue(dimension, o)}
                  </div>
                ))}
              </div>
            )}
          </label>
          <div className="flex justify-end gap-2">
            <Popover.Close asChild>
              <Control variant="ghost">Cancel</Control>
            </Popover.Close>
            <Control variant="dark" onClick={() => add(value)}>
              Add filter
            </Control>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
