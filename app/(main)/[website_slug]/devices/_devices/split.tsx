"use client";

import { displayValue } from "@/components/shell/dimensions";
import { Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import { SplitBar } from "@/components/shell/views";
import type { BreakdownMultiRow } from "@/lib/query/breakdown";
import type { Section as Settled } from "@/lib/screens/settle";

/** The device split with deltas (design §8.6). */
export function DevicesSplit({
  split,
  compare,
}: {
  split: Settled<{
    rows: BreakdownMultiRow[];
    previous: Record<string, BreakdownMultiRow> | null;
  }>;
  compare: boolean;
}) {
  if (!split.ok) return <SectionError title="Devices" strong />;
  const segments = split.data.rows.map((r) => ({
    key: r.value,
    label: displayValue("device", r.value),
    value: Number(r.visitors ?? 0),
    previous: split.data.previous
      ? Number(split.data.previous[r.value]?.visitors ?? 0)
      : undefined,
  }));
  return (
    <Section title="Devices" qualifier="visitors" strong>
      {segments.length ? (
        <SplitBar title="Devices" segments={segments} compare={compare} />
      ) : (
        <p className="text-[12.5px] text-mute">No visitors in this period.</p>
      )}
    </Section>
  );
}
