"use client";

import { Section } from "@/components/shell/section";
import { SplitBar } from "@/components/shell/views";
import { fmtDuration, fmtInt } from "@/lib/format";
import type { BreakdownMultiRow } from "@/lib/query/breakdown";
import { attentionSummary } from "./attention";

/** The Pages lead view (D-011): one split bar of pageviews and a sentence. */
export function AttentionLine({
  rows,
  pageviews,
}: {
  rows: BreakdownMultiRow[];
  pageviews: number;
}) {
  const s = attentionSummary(
    rows.map((r) => ({
      value: r.value,
      pageviews: Number(r.pageviews ?? 0),
      engagedMs: Number(r.engaged_time ?? 0),
    })),
    pageviews
  );
  if (!s) return null;
  const top =
    s.topCount === 1
      ? "The top page takes"
      : `The top ${s.topCount === 2 ? "two" : "three"} pages take`;
  return (
    <Section
      title="Where the attention goes"
      qualifier={`share of ${fmtInt(pageviews)} pageviews`}
    >
      <SplitBar
        title="Where the attention goes"
        segments={s.segments}
        format={fmtInt}
        ramp
      />
      <p className="mt-3 text-[13px] text-ink-2">
        {top} <b className="font-medium text-ink">{s.topShare.toFixed(0)}%</b>{" "}
        of pageviews.
        {s.longest && (
          <>
            {" "}
            Attention is longest on{" "}
            <b className="font-medium text-ink">{s.longest.path}</b>,{" "}
            {fmtDuration(s.longest.ms)} per view
            {s.shortest ? (
              <>
                , and shortest on{" "}
                <b className="font-medium text-ink">{s.shortest.path}</b>,{" "}
                {fmtDuration(s.shortest.ms)}.
              </>
            ) : (
              "."
            )}
          </>
        )}
      </p>
    </Section>
  );
}
