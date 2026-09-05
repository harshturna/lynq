"use client";

import { Suspense, useCallback } from "react";
import { Control } from "@/components/shell/control";
import { FilterBuilder } from "@/components/shell/filter-builder";
import { FilterChips } from "@/components/shell/filter-chips";
import { LiveDot, PageHeader } from "@/components/shell/page-header";
import { ComparePicker, RangePicker } from "@/components/shell/range-picker";
import {
  presetDates,
  rangeLabel,
  stepRange,
  todayIn,
} from "@/components/shell/ranges";
import { Shortcuts } from "@/components/shell/shortcuts";
import { TopNav } from "@/components/shell/top-nav";
import { ShellProvider, useViewState } from "@/components/shell/view-state";
import { withParam } from "@/lib/url-state";

const SITE = { slug: "shell", name: "Aivia", url: "aivia.byharsh.com" };
const SITES = [
  SITE,
  { slug: "lynq-byharsh-com", name: "Lynq", url: "lynq.byharsh.com" },
];
const TZ = "America/Toronto";
const SUGGEST: Record<string, string[]> = {
  country: ["CA", "US", "IN", "GB", "DE"],
  path: ["/", "/pricing", "/docs/getting-started", "/signup"],
  channel: ["Organic Search", "Direct", "Referral", "Social", "Email"],
  device: ["desktop", "mobile", "tablet"],
};

function Body() {
  const { state, update, pending } = useViewState();
  const today = todayIn(TZ);
  const dates = presetDates(state.range, today);
  const stepRangeBy = useCallback(
    (d: -1 | 1) => {
      const next = stepRange(state.range, d, today);
      if (next !== state.range) update(withParam(state, "range", next));
    },
    [state, update, today]
  );
  return (
    <div className="mx-auto flex max-w-[1320px] flex-col gap-6 px-8 py-6">
      <Shortcuts enabled onRangeStep={stepRangeBy} />
      <PageHeader
        title="Overview"
        subtitle={
          <>
            <LiveDot>6 on the site now</LiveDot> ·{" "}
            {rangeLabel(
              dates.from === dates.to
                ? state.range
                : { from: dates.from, to: dates.to }
            )}{" "}
            ·{" "}
            {state.compare === "none"
              ? "no comparison"
              : "compared with the previous period"}{" "}
            · {TZ}
          </>
        }
        controls={
          <>
            <RangePicker timezone={TZ} />
            <ComparePicker />
            <FilterBuilder
              id="add-filter"
              suggest={async (d) => SUGGEST[d] ?? []}
            />
            <Control variant="dark">Share</Control>
          </>
        }
      />
      <FilterChips addButtonId="add-filter" />
      <div
        aria-busy={pending}
        className={
          pending ? "opacity-70 transition-opacity" : "transition-opacity"
        }
      >
        <pre className="rounded-control bg-soft p-4 text-[12px] text-ink-2">
          {JSON.stringify(state, null, 2)}
        </pre>
      </div>
    </div>
  );
}

export function ShellPreview() {
  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <Suspense>
        <ShellProvider>
          <TopNav site={SITE} sites={SITES} userEmail="harsh@example.com" />
          <Body />
        </ShellProvider>
      </Suspense>
    </div>
  );
}
