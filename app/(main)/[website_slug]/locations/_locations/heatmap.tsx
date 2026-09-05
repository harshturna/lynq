"use client";

import { Heatmap } from "@/components/charts/shapes";
import { displayValue } from "@/components/shell/dimensions";
import { Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import type { Section as Settled } from "@/lib/screens/settle";

/** When each country is awake (design §8.5): visitors by hour in the site's timezone. */
export function LocationsHeatmap({
  heat,
}: {
  heat: Settled<{
    rows: { value: string; hours: number[] }[];
    sessions: number;
  }>;
}) {
  if (!heat.ok) return <SectionError title="When each country is awake" />;
  const rows = heat.data.rows.map((r) => ({
    key: r.value,
    label: displayValue("country", r.value),
    hours: r.hours,
  }));
  return (
    <Section
      title="When each country is awake"
      qualifier="visitors by hour of day, site timezone"
    >
      {rows.length ? (
        <Heatmap
          title="Visitors by country and hour of day"
          rows={rows}
          sessions={heat.data.sessions}
        />
      ) : (
        <p className="py-4 text-[12.5px] text-mute">
          No visitors in this period.
        </p>
      )}
    </Section>
  );
}
