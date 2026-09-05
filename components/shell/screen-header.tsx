"use client";

import { type ReactNode, useCallback } from "react";
import { withParam } from "@/lib/url-state";
import { FilterBuilder } from "./filter-builder";
import { FilterChips } from "./filter-chips";
import { PageHeader } from "./page-header";
import { ComparePicker, RangePicker } from "./range-picker";
import { presetDates, rangeLabel, stepRange, todayIn } from "./ranges";
import { Shortcuts } from "./shortcuts";
import { useViewState } from "./view-state";

/** Title, range, compare, filters and the keyboard shortcuts, for every screen (design §6). */
export function ScreenHeader({
  title,
  timezone,
  shortcuts,
  suggest,
  extra,
  controls,
  pickers = true,
  subtitle,
}: {
  title: string;
  timezone: string;
  shortcuts: boolean;
  suggest: (dimension: string) => Promise<string[]>;
  /** Appended to the subtitle. */
  extra?: ReactNode;
  /** Extra controls before the range picker (a search box, a segment). */
  controls?: ReactNode;
  /** Range and compare pickers; Realtime replaces them with its own segment. */
  pickers?: boolean;
  /** Replaces the range sentence in the subtitle when the pickers are off. */
  subtitle?: ReactNode;
}) {
  const { state, update } = useViewState();
  const today = todayIn(timezone);
  const dates = presetDates(state.range, today);
  const step = useCallback(
    (d: -1 | 1) => {
      const next = stepRange(state.range, d, today);
      if (next !== state.range) update(withParam(state, "range", next));
    },
    [state, update, today]
  );
  const compareText =
    state.compare === "none"
      ? "no comparison"
      : state.compare === "previous_year"
        ? "compared with the previous year"
        : "compared with the previous period";
  return (
    <>
      <Shortcuts enabled={shortcuts} onRangeStep={step} />
      <PageHeader
        title={title}
        subtitle={
          pickers ? (
            <>
              {extra}
              {rangeLabel({ from: dates.from, to: dates.to })} · {compareText} ·{" "}
              {timezone}
            </>
          ) : (
            <>
              {extra}
              {subtitle}
            </>
          )
        }
        controls={
          <>
            {controls}
            {pickers && <RangePicker timezone={timezone} />}
            {pickers && <ComparePicker />}
            <FilterBuilder id="add-filter" suggest={suggest} />
          </>
        }
      />
      <FilterChips addButtonId="add-filter" />
    </>
  );
}
