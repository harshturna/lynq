"use client";

import { useEffect, useRef } from "react";
import { withoutFilter } from "@/lib/url-state";
import { cn } from "@/lib/utils";
import {
  dimensionLabel,
  dimensionScope,
  displayValue,
  filterSentence,
} from "./dimensions";
import { useAnnounce, useViewState } from "./view-state";

/**
 * Active filters as chips (design §6): one button per chip, named with the
 * whole sentence and the removal key; Delete or Backspace removes it; focus
 * moves to the next chip, else the previous, else + Filter; the page's status
 * region announces the change once the transition settles. Session-scoped
 * chips carry their scope in the label.
 */
export function FilterChips({ addButtonId }: { addButtonId?: string }) {
  const { state, update } = useViewState();
  const announce = useAnnounce();
  const listRef = useRef<HTMLFieldSetElement>(null);
  const focusIndex = useRef<number | null>(null);

  // After a removal, focus the chip that took the removed one's place.
  useEffect(() => {
    if (focusIndex.current === null) return;
    const chips =
      listRef.current?.querySelectorAll<HTMLButtonElement>("[data-chip]") ?? [];
    const target = chips[focusIndex.current] ?? chips[focusIndex.current - 1];
    focusIndex.current = null;
    if (target) target.focus();
    else if (addButtonId) document.getElementById(addButtonId)?.focus();
  });

  const chips = state.filters.flatMap((f) =>
    f.values.map((value) => ({ f, value }))
  );
  if (!chips.length) return null;

  const remove = (index: number) => {
    const { f, value } = chips[index];
    const next = withoutFilter(state, f.dimension, value);
    const count = next.filters.reduce((n, x) => n + x.values.length, 0);
    focusIndex.current = index;
    update(next);
    announce(
      `Removed ${filterSentence(f.dimension, f.op, [value])}. ${count} ${count === 1 ? "filter" : "filters"}.`
    );
  };
  const clear = () => {
    update({ ...state, filters: [] });
    announce("Cleared all filters.");
    if (addButtonId) document.getElementById(addButtonId)?.focus();
  };

  return (
    <fieldset ref={listRef} className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">Active filters</legend>
      {chips.map(({ f, value }, i) => {
        const scope = dimensionScope(f.dimension);
        return (
          <button
            key={`${f.dimension}:${f.op}:${value}`}
            type="button"
            data-chip
            aria-label={`${filterSentence(f.dimension, f.op, [value])}, press Delete to remove`}
            onClick={() => remove(i)}
            onKeyDown={(e) => {
              if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                remove(i);
              }
            }}
            className={cn(
              "group inline-flex h-7 items-center gap-2 rounded-control bg-soft pl-[11px] pr-[6px] text-[12.5px] font-medium text-ink",
              "hover:bg-soft-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            )}
          >
            <span className="font-normal text-mute">
              {dimensionLabel(f.dimension)}
              {f.op !== "is"
                ? ` ${f.op === "is_not" ? "is not" : "contains"}`
                : ""}
              {scope === "session" && (
                <span className="sr-only"> (whole sessions)</span>
              )}
            </span>
            <span>{displayValue(f.dimension, value)}</span>
            <span
              aria-hidden
              className="inline-flex h-6 w-6 items-center justify-center rounded-chip text-mute group-hover:text-ink"
            >
              ×
            </span>
          </button>
        );
      })}
      {chips.length > 1 && (
        <button
          type="button"
          onClick={clear}
          className="text-[12.5px] text-mute underline underline-offset-4 hover:text-ink"
        >
          Clear all
        </button>
      )}
    </fieldset>
  );
}
