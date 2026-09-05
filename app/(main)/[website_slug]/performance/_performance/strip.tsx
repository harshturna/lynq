"use client";

import { DeltaBadge, Pill } from "@/components/shell/badge";
import { KpiStrip, type KpiTile } from "@/components/shell/kpi-strip";
import { SectionError } from "@/components/shell/section-error";
import { fmtInt } from "@/lib/format";
import type { VitalsSummary } from "@/lib/query/vitals";
import type { Section as Settled } from "@/lib/screens/settle";
import {
  fmtVital,
  RENDERED_VITALS as RENDERED,
  STATUS_TEXT,
  VITAL_LABELS,
  vitalStatus,
} from "@/lib/vitals";

/** p75 per vital with a status pill and the change (design §8.9). Lower is better. */
export function VitalsStrip({
  strip,
  compare,
}: {
  strip: Settled<{ current: VitalsSummary; previous: VitalsSummary | null }>;
  compare: boolean;
}) {
  if (!strip.ok) return <SectionError title="Web Vitals" strong />;
  const { current, previous } = strip.data;
  const tiles: KpiTile[] = RENDERED.map((k) => {
    const v = current[k];
    const p = previous?.[k] ?? null;
    const status = vitalStatus(k, v);
    return {
      key: k,
      label: `${VITAL_LABELS[k]} p75`,
      value: fmtVital(k, v),
      delta: (
        <span className="flex items-center gap-2">
          <Pill status={status}>{STATUS_TEXT[status]}</Pill>
          {compare && v !== null && p !== null && (
            <DeltaBadge current={v} previous={p} lowerIsBetter />
          )}
        </span>
      ),
      note: compare && p !== null ? `vs ${fmtVital(k, p)}` : undefined,
    };
  });
  return (
    <div className="flex flex-col gap-2">
      <KpiStrip tiles={tiles} label="Web Vitals" />
      <p className="text-[12px] text-mute">
        {current.samples
          ? `${fmtInt(current.samples)} samples in this range`
          : "No vitals samples in this range. The tracker reports them with data-vitals."}
      </p>
    </div>
  );
}
