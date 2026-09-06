"use client";

import { LineChart } from "@/components/charts/charts";
import { Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import type { Point } from "@/lib/charts/format";
import type { LineSeries } from "@/lib/charts/line";
import type { Granularity } from "@/lib/query/ranges";
import type { Section as Settled } from "@/lib/screens/settle";
import { DEVICES, fmtVital, LCP_GOOD } from "@/lib/vitals";

const COLOR: Record<(typeof DEVICES)[number], LineSeries["color"]> = {
  desktop: "ink",
  mobile: "accent",
  tablet: "muted",
};
const LABEL: Record<(typeof DEVICES)[number], string> = {
  desktop: "Desktop",
  mobile: "Mobile",
  tablet: "Tablet",
};

/** LCP p75 per bucket by device against the 2.5 s threshold (design §8.9). */
export function LcpByDevice({
  byDevice,
  granularity,
  timezone,
}: {
  byDevice: Settled<Record<string, Point[]>>;
  granularity: Granularity;
  timezone: string;
}) {
  if (!byDevice.ok) return <SectionError title="LCP by device" />;
  const series: LineSeries[] = DEVICES.filter((d) =>
    (byDevice.data[d] ?? []).some((p) => p.v > 0)
  ).map((d) => ({
    name: LABEL[d],
    points: byDevice.data[d],
    color: COLOR[d],
    format: (v: number) => (v === 0 ? "0" : fmtVital("lcp", v)),
  }));
  return (
    <Section
      title="LCP p75 by device"
      qualifier={`per ${granularity}`}
      right={
        <span className="flex gap-4">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-[6px]">
              <i
                aria-hidden
                className="inline-block h-0 w-[14px] border-t-2"
                style={{
                  borderColor:
                    s.color === "ink"
                      ? "var(--ink)"
                      : s.color === "muted"
                        ? "var(--compare)"
                        : "var(--teal)",
                }}
              />
              {s.name}
            </span>
          ))}
        </span>
      }
    >
      {series.length ? (
        <LineChart
          title={`LCP p75 by device per ${granularity}`}
          series={series}
          granularity={granularity}
          timezone={timezone}
          threshold={{ value: LCP_GOOD, label: "2.5s" }}
          height={220}
        />
      ) : (
        <p className="py-4 text-[12.5px] text-mute">
          No vitals samples in this range.
        </p>
      )}
    </Section>
  );
}
