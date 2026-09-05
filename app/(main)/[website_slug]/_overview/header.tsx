"use client";

import { useCallback } from "react";
import { FilterBuilder } from "@/components/shell/filter-builder";
import { FilterChips } from "@/components/shell/filter-chips";
import { PageHeader } from "@/components/shell/page-header";
import { ComparePicker, RangePicker } from "@/components/shell/range-picker";
import {
  presetDates,
  rangeLabel,
  stepRange,
  todayIn,
} from "@/components/shell/ranges";
import { Shortcuts } from "@/components/shell/shortcuts";
import { useViewState } from "@/components/shell/view-state";
import { withParam } from "@/lib/url-state";

/** Title, range, compare, filters and the keyboard shortcuts (design §6). */
export function OverviewHeader({
  timezone,
  shortcuts,
  suggest,
}: {
  timezone: string;
  shortcuts: boolean;
  suggest: (dimension: string) => Promise<string[]>;
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
        title="Overview"
        subtitle={
          <>
            {rangeLabel({ from: dates.from, to: dates.to })} · {compareText} ·{" "}
            {timezone}
          </>
        }
        controls={
          <>
            <RangePicker timezone={timezone} />
            <ComparePicker />
            <FilterBuilder id="add-filter" suggest={suggest} />
          </>
        }
      />
      <FilterChips addButtonId="add-filter" />
    </>
  );
}
