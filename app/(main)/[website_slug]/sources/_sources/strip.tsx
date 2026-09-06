"use client";

import { DeltaBadge } from "@/components/shell/badge";
import { KpiStrip, type KpiTile } from "@/components/shell/kpi-strip";
import { SectionError } from "@/components/shell/section-error";
import { VisitorTotal } from "@/components/shell/visitor-total";
import { fmtDuration, fmtInt, fmtPct, fmtRevenue } from "@/lib/format";
import type { Section as Settled } from "@/lib/screens/settle";
import type { StripTile, TileKind } from "@/lib/screens/sources";

function fmt(kind: TileKind, v: number): string {
  switch (kind) {
    case "int":
      return fmtInt(v);
    case "pct":
      return fmtPct(v, 1);
    case "duration":
      return fmtDuration(v);
    case "money":
      return fmtRevenue(v);
  }
}

/** The strip in its KPI state (design §8.0), static: nothing to drive here. */
export function SourcesStrip({
  strip,
  compare,
}: {
  strip: Settled<StripTile[]>;
  compare: boolean;
}) {
  if (!strip.ok) return <SectionError title="Summary" strong />;
  const tiles: KpiTile[] = strip.data.map((t) => ({
    key: t.key,
    label: t.label,
    value: t.empty ? "—" : fmt(t.kind, t.value),
    delta:
      compare && !t.empty && t.previous !== null ? (
        <DeltaBadge
          current={t.value}
          previous={t.previous}
          lowerIsBetter={t.lowerIsBetter}
          points={t.kind === "pct"}
        />
      ) : undefined,
    note:
      compare && !t.empty && t.previous !== null
        ? `vs ${fmt(t.kind, t.previous)}`
        : undefined,
  }));
  const visitors = strip.data.find((t) => t.key === "visitors");
  return (
    <>
      {visitors && <VisitorTotal value={visitors.value} />}
      <KpiStrip tiles={tiles} label="Summary" />
    </>
  );
}
