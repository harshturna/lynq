"use client";

import { Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import { Matrix } from "@/components/shell/views";
import type { Section as Settled } from "@/lib/screens/settle";

/** Browser by operating system (design §8.6). */
export function DevicesMatrix({
  matrix,
}: {
  matrix: Settled<{
    rows: string[];
    cols: string[];
    cells: (number | null)[][];
  }>;
}) {
  if (!matrix.ok) return <SectionError title="Browser by operating system" />;
  const m = matrix.data;
  return (
    <Section title="Browser by operating system" qualifier="visitors">
      {m.rows.length && m.cols.length ? (
        <Matrix
          title="Visitors by browser and operating system"
          rowHeader="Browser"
          data={{
            rows: m.rows.map((r) => r || "Unknown"),
            cols: m.cols.map((c) => c || "Unknown"),
            cells: m.cells,
            unit: "visitors",
          }}
        />
      ) : (
        <p className="text-[12.5px] text-mute">No visitors in this period.</p>
      )}
    </Section>
  );
}
