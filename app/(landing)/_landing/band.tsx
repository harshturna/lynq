import type { DemoStats } from "@/lib/screens/landing";
import { DrawnLine } from "./drawn-line";
import { Reveal } from "./reveal";

const AXIS = ["Aug 8", "Aug 15", "Aug 22", "Aug 29", "Sep 5"];

function axisFor(days: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (const back of [
    days - 1,
    Math.round((days - 1) * 0.75),
    Math.round((days - 1) * 0.5),
    Math.round((days - 1) * 0.25),
    0,
  ]) {
    const d = new Date(now.getTime() - back * 86_400_000);
    out.push(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
  }
  return out.length === 5 ? out : AXIS;
}

/** Under the hero: the last 30 days of a real site, one hairline that draws itself (D-014). */
export function DemoBand({ demo }: { demo: DemoStats }) {
  return (
    <Reveal className="pt-2">
      <div className="flex items-baseline justify-between border-t border-rule-strong pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-teal">
          Last 30 days
        </span>
        <span className="whitespace-nowrap text-[13px] text-mute">
          <b className="mr-[6px] text-[22px] font-medium tracking-[-0.02em] text-ink tabular">
            {demo.visitors.toLocaleString("en-US")}
          </b>
          unique visitors
        </span>
      </div>
      <DrawnLine values={demo.series} />
      <div className="mt-1 flex justify-between text-[11px] text-mute">
        {axisFor(demo.series.length || 30).map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
    </Reveal>
  );
}
