"use client";

import { Pill } from "@/components/shell/badge";
import { displayValue } from "@/components/shell/dimensions";
import { RowBar, Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import { useViewState } from "@/components/shell/view-state";
import { fmtInt } from "@/lib/format";
import type { SelectedPage } from "@/lib/screens/performance";
import type { Section as Settled } from "@/lib/screens/settle";
import { withParam } from "@/lib/url-state";
import { fmtVital, STATUS_TEXT, vitalStatus } from "@/lib/vitals";

/** What is slow on the selected page (design §8.9): LCP element, INP target, slowest countries. */
export function SlowPanel({
  selected,
}: {
  selected: Settled<SelectedPage | null>;
}) {
  const { state, update } = useViewState();
  if (!selected.ok) return <SectionError title="What is slow" strong />;
  const s = selected.data;
  if (!s) return null;
  const targets = (
    title: string,
    vital: "lcp" | "inp",
    list: SelectedPage["lcpTargets"]
  ) => (
    <Section title={title} qualifier="element · samples · p75" strong>
      {list.length ? (
        <ol className="flex flex-col gap-1">
          {list.map((t) => {
            const status = vitalStatus(vital, t.p75);
            return (
              <li
                key={t.value}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-rule py-[6px] text-[12.5px]"
              >
                <code className="truncate text-[12px] text-ink">{t.value}</code>
                <span className="text-mute tabular">{fmtInt(t.samples)}</span>
                <span className="flex items-center gap-2 tabular">
                  {fmtVital(vital, t.p75)}
                  <Pill status={status}>{STATUS_TEXT[status]}</Pill>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-[12.5px] text-mute">
          No element attribution yet. The tracker reports it with data-vitals on
          browsers that expose it.
        </p>
      )}
    </Section>
  );
  const max = Math.max(1, ...s.countries.map((c) => c.lcp ?? 0));
  return (
    <div className="flex flex-col gap-7">
      <div className="flex items-center gap-3 border-t border-rule-strong pt-3 text-[14px] font-medium">
        <span>What is slow on {s.path}</span>
        <button
          type="button"
          onClick={() =>
            update(withParam(state, "sel", undefined), { replace: true })
          }
          className="ml-auto text-[12px] font-normal text-mute hover:text-ink"
        >
          Clear
        </button>
      </div>
      <div className="grid gap-8 min-[1000px]:grid-cols-3">
        {targets("LCP element", "lcp", s.lcpTargets)}
        {targets("INP target", "inp", s.inpTargets)}
        <Section title="Slowest countries" qualifier="LCP p75" strong>
          {s.countries.length ? (
            <div className="flex flex-col gap-1">
              {s.countries.map((c) => (
                <RowBar
                  key={c.value}
                  label={displayValue("country", c.value)}
                  value={fmtVital("lcp", c.lcp)}
                  share={((c.lcp ?? 0) / max) * 100}
                />
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-mute">No samples on this page.</p>
          )}
        </Section>
      </div>
    </div>
  );
}
