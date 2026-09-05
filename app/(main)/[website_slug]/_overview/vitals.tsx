import Link from "next/link";
import { Pill } from "@/components/shell/badge";
import { Section } from "@/components/shell/section";
import { fmtInt } from "@/lib/format";
import type { VitalsSummary } from "@/lib/query/vitals";
import type { Section as Settled } from "@/lib/screens/settle";
import { fmtVital, STATUS_TEXT, VITAL_LABELS, vitalStatus } from "@/lib/vitals";
import { SectionError } from "./section-error";

const VITALS = ["lcp", "inp", "cls", "fcp", "ttfb"] as const;

/** The Web Vitals strip at the bottom of the Overview (design §8.1). */
export function VitalsStrip({
  slug,
  vitals,
}: {
  slug: string;
  vitals: Settled<VitalsSummary>;
}) {
  if (!vitals.ok) return <SectionError title="Web Vitals" strong />;
  const v = vitals.data;
  return (
    <Section
      title="Web Vitals"
      qualifier={
        v.samples
          ? `p75 · ${fmtInt(v.samples)} samples`
          : "p75 · no samples in this range"
      }
      right={
        <Link
          href={`/${slug}/performance`}
          className="text-teal-ink hover:underline"
        >
          Performance
        </Link>
      }
      strong
    >
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
        {VITALS.map((k) => {
          const status = vitalStatus(k, v[k]);
          return (
            <li key={k} className="flex items-center gap-2">
              <span>
                {VITAL_LABELS[k]}{" "}
                <b className="font-medium tabular">{fmtVital(k, v[k])}</b>
              </span>
              <Pill status={status}>{STATUS_TEXT[status]}</Pill>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
