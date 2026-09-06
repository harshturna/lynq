"use client";

import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import type { CompareMode, Range } from "@/lib/query/ranges";
import { type Compare, withParam } from "@/lib/url-state";
import { cn } from "@/lib/utils";
import { Calendar } from "./calendar";
import { Caret, Control } from "./control";
import { PRESETS, presetDates, rangeLabel, stepRange, todayIn } from "./ranges";
import { useAnnounce, useViewState } from "./view-state";

const POPOVER =
  "z-50 rounded-control border border-rule bg-canvas p-3 shadow-[0_8px_24px_-12px_rgba(10,10,10,0.25)] outline-none";

/** Range presets plus a custom two-date range, with ‹ › to step (design §6). */
export function RangePicker({ timezone }: { timezone: string }) {
  const { state, update } = useViewState();
  const announce = useAnnounce();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{ from: string; to?: string } | null>(
    null
  );
  const today = todayIn(timezone);
  const current = presetDates(state.range, today);

  const choose = (range: Range) => {
    update(withParam(state, "range", range));
    announce(`Range ${rangeLabel(range)}.`);
    setOpen(false);
    setDraft(null);
  };
  const step = (direction: -1 | 1) => {
    const next = stepRange(state.range, direction, today);
    if (next !== state.range) choose(next);
  };

  return (
    <div className="inline-flex items-center gap-1">
      <Control
        variant="ghost"
        aria-label="Previous period"
        onClick={() => step(-1)}
        className="w-[30px] justify-center px-0"
      >
        ‹
      </Control>
      <Popover.Root
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setDraft(null);
        }}
      >
        <Popover.Trigger asChild>
          <Control aria-label={`Date range, ${rangeLabel(state.range)}`}>
            {rangeLabel(state.range)} <Caret />
          </Control>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            collisionPadding={12}
            className={cn(
              POPOVER,
              "flex max-w-[calc(100vw-24px)] flex-wrap gap-4"
            )}
          >
            <fieldset className="flex w-[150px] flex-col gap-[2px] max-[479px]:w-full">
              <legend className="sr-only">Presets</legend>
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => choose(p.value)}
                  aria-pressed={state.range === p.value}
                  className={cn(
                    "rounded-chip px-2 py-[5px] text-left text-[13px] text-ink-2 hover:bg-soft",
                    state.range === p.value &&
                      "bg-teal-soft font-medium text-teal-ink"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </fieldset>
            <div>
              <Calendar
                timezone={timezone}
                today={today}
                from={draft?.from ?? current.from}
                to={draft ? draft.to : current.to}
                onChange={setDraft}
                announce={announce}
              />
              <div className="mt-3 flex items-center justify-between text-[12px] text-mute">
                <span>
                  {draft && !draft.to ? "Choose an end date" : "Custom range"}
                </span>
                <Control
                  variant="dark"
                  disabled={!draft?.to}
                  onClick={() =>
                    draft?.to && choose({ from: draft.from, to: draft.to })
                  }
                  className="h-7"
                >
                  Apply
                </Control>
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <Control
        variant="ghost"
        aria-label="Next period"
        onClick={() => step(1)}
        disabled={current.to >= today}
        className="w-[30px] justify-center px-0 disabled:text-faint"
      >
        ›
      </Control>
    </div>
  );
}

export const COMPARES: { value: Compare; label: string }[] = [
  { value: "previous_period", label: "Previous period" },
  { value: "previous_year", label: "Same period last year" },
  { value: "none", label: "No comparison" },
];

export function ComparePicker() {
  const { state, update } = useViewState();
  const announce = useAnnounce();
  const label =
    COMPARES.find((c) => c.value === state.compare)?.label ?? "Compare";
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Control variant="ghost" aria-label={`Comparison, ${label}`}>
          {state.compare === "none" ? "Compare" : `vs ${label.toLowerCase()}`}{" "}
          <Caret />
        </Control>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className={cn(POPOVER, "flex w-[220px] flex-col gap-[2px] p-1")}
        >
          {COMPARES.map((c) => (
            <Popover.Close key={c.value} asChild>
              <button
                type="button"
                aria-pressed={state.compare === c.value}
                onClick={() => {
                  update(
                    withParam(state, "compare", c.value as CompareMode | "none")
                  );
                  announce(`Comparison: ${c.label}.`);
                }}
                className={cn(
                  "rounded-chip px-2 py-[6px] text-left text-[13px] text-ink-2 hover:bg-soft",
                  state.compare === c.value &&
                    "bg-teal-soft font-medium text-teal-ink"
                )}
              >
                {c.label}
              </button>
            </Popover.Close>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
