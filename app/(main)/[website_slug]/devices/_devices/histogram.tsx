"use client";

import { Histogram } from "@/components/charts/shapes";
import { Section } from "@/components/shell/section";
import { SectionError } from "@/components/shell/section-error";
import { fmtInt, fmtRatio } from "@/lib/format";
import type { HistogramData } from "@/lib/screens/devices";
import type { Section as Settled } from "@/lib/screens/settle";

const TONES = ["accent", "muted", "accent", "muted"] as const;

/** Viewport widths against the site's breakpoints, with the share per band (design §8.6). */
export function DevicesHistogram({
  histogram,
}: {
  histogram: Settled<HistogramData>;
}) {
  if (!histogram.ok) return <SectionError title="Viewport widths" />;
  const h = histogram.data;
  const bandOf = (from: number) => {
    let i = 0;
    for (const bp of h.breakpoints) if (from >= bp) i++;
    return i;
  };
  const bins = h.bins.map((b) => ({
    label: b.from % 400 === 0 ? `${b.from}px` : "",
    from: b.from,
    to: b.to ?? b.from + 100,
    count: b.count,
    tone: TONES[bandOf(b.from) % TONES.length],
  }));
  const names = (i: number) =>
    i === 0
      ? `under ${h.breakpoints[0]}`
      : i < h.breakpoints.length
        ? `${h.breakpoints[i - 1]} to ${h.breakpoints[i]}`
        : `${h.breakpoints[h.breakpoints.length - 1]} and up`;
  return (
    <Section
      title="Viewport widths"
      qualifier={
        h.measured === "viewport_width"
          ? "what your CSS actually meets"
          : "screen width; these rows predate viewport tracking"
      }
    >
      <Histogram
        title="Viewport width"
        name="Pageviews"
        bins={bins}
        samples={h.samples}
        labelEvery={4}
        markersAt={h.breakpoints.map((bp) => ({ value: bp, label: `${bp}` }))}
      />
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-2">
        {h.bands.map((b, i) => (
          <li key={b.from}>
            <span className="text-mute">{names(i)}</span>{" "}
            <b className="font-medium text-ink tabular">
              {fmtRatio(b.count, h.samples, 0)}
            </b>{" "}
            <span className="text-faint tabular">· {fmtInt(b.count)}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
