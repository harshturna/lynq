"use client";

import { Quadrant } from "@/components/charts/shapes";
import { Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import { useAnnounce, useViewState } from "@/components/shell/view-state";
import { fmtDuration, fmtInt, fmtPct, fmtRevenue } from "@/lib/format";
import type { Kpi } from "@/lib/screens/kpi";
import type { Section as Settled } from "@/lib/screens/settle";
import type { QuadrantData } from "@/lib/screens/sources";
import { withFilter } from "@/lib/url-state";

/** Where to spend the next hour (design §8.4): visitors across, the KPI's rate up. */
export function SourcesQuadrant({
  quadrant,
  kpi,
}: {
  quadrant: Settled<QuadrantData>;
  kpi: Kpi;
}) {
  const { state, update } = useViewState();
  const announce = useAnnounce();
  if (!quadrant.ok) return <SectionError title="Sources by visitors" />;
  const q = quadrant.data;
  const yLabel = q.y === "conversion" ? "Conversion" : "Engaged time";
  const sizeLabel =
    q.size === "revenue"
      ? "Revenue"
      : q.size === "completions"
        ? "Completions"
        : "Visitors";
  const corners: [string, string, string, string] =
    q.y === "conversion"
      ? ["scale these", "winning", "watch", "fix the landing page"]
      : ["engaging, small", "engaging, big", "shallow, small", "shallow, big"];
  const qualifier =
    q.y === "conversion"
      ? `each source by visitors and conversion to ${kpi.goal?.name ?? "the KPI"}; bubble size is ${sizeLabel.toLowerCase()}`
      : `each source by visitors and engaged time per session; bubble size is visitors`;
  return (
    <Section title="Where to spend the next hour" qualifier={qualifier}>
      <Quadrant
        title={`Sources by visitors and ${yLabel.toLowerCase()}`}
        points={q.points}
        xLabel="Visitors"
        yLabel={yLabel}
        sizeLabel={sizeLabel}
        avgX={q.avgX}
        avgY={q.avgY}
        formatY={
          q.y === "conversion"
            ? (v) => fmtPct(v, 1)
            : (v) => fmtDuration(v * 1000)
        }
        formatSize={q.size === "revenue" ? fmtRevenue : fmtInt}
        corners={corners}
        onMarkClick={(m) => {
          const p = q.points[m.dataIndex];
          if (!p) return;
          update(
            withFilter(state, {
              dimension: "entry_source",
              op: "is",
              values: [p.key],
            })
          );
          announce(`Added Entry source is ${p.label}.`);
        }}
      />
    </Section>
  );
}
