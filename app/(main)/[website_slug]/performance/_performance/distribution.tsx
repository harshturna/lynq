"use client";

import { Histogram } from "@/components/charts/shapes";
import { Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import { fmtInt, fmtRatio } from "@/lib/format";
import type { Section as Settled } from "@/lib/screens/settle";
import { LCP_GOOD, LCP_POOR } from "@/lib/vitals";

/** LCP distribution in the three bands (design §8.9). */
export function LcpDistribution({
  distribution,
}: {
  distribution: Settled<{
    bins: { from: number; to: number | null; count: number }[];
    samples: number;
  }>;
}) {
  if (!distribution.ok) return <SectionError title="LCP distribution" />;
  const { bins, samples } = distribution.data;
  const tone = (from: number) =>
    from < LCP_GOOD ? "good" : from < LCP_POOR ? "warn" : "poor";
  const band = (lo: number, hi: number | null) =>
    bins
      .filter((b) => b.from >= lo && (hi === null || b.from < hi))
      .reduce((a, b) => a + b.count, 0);
  const good = band(0, LCP_GOOD);
  const warn = band(LCP_GOOD, LCP_POOR);
  const poor = band(LCP_POOR, null);
  return (
    <Section
      title="LCP distribution"
      qualifier={`${fmtInt(samples)} samples · good under 2.5s, poor over 4s`}
    >
      <Histogram
        title="LCP distribution"
        name="Samples"
        bins={bins.map((b) => ({
          label: b.from % 1000 === 0 ? `${b.from / 1000}s` : "",
          from: b.from,
          to: b.to ?? b.from + 250,
          count: b.count,
          tone: tone(b.from),
        }))}
        samples={samples}
        labelEvery={4}
        markersAt={[
          { value: LCP_GOOD, label: "2.5s" },
          { value: LCP_POOR, label: "4s" },
        ]}
      />
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-2">
        <li>
          <span className="text-good">●</span> Good{" "}
          <b className="font-medium text-ink tabular">
            {fmtRatio(good, samples, 0)}
          </b>
        </li>
        <li>
          <span className="text-warn">●</span> Needs work{" "}
          <b className="font-medium text-ink tabular">
            {fmtRatio(warn, samples, 0)}
          </b>
        </li>
        <li>
          <span className="text-poor">●</span> Poor{" "}
          <b className="font-medium text-ink tabular">
            {fmtRatio(poor, samples, 0)}
          </b>
        </li>
      </ul>
    </Section>
  );
}
