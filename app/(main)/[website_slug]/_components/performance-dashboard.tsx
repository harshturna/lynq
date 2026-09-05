import { Card } from "@/components/ui/card";
import type { VitalsSummary } from "@/lib/query/vitals";
import CoreVitalCard from "./core-vital-card";

interface PerformanceDashboardProps {
  /** p75 per metric over the range; null when no row reported that metric. */
  vitals: VitalsSummary;
}

/** The vital card treats anything at or below -1 as "not enough data". */
const score = (value: number | null) => value ?? -1;

const PerformanceDashboard = ({ vitals }: PerformanceDashboardProps) => {
  return (
    <>
      <div className="md:grid grid-cols-3 gap-4 flex-wrap">
        <CoreVitalCard type="lcp" score={score(vitals.lcp)} isCore />
        <CoreVitalCard type="inp" score={score(vitals.inp)} isCore />
        <CoreVitalCard type="cls" score={score(vitals.cls)} isCore />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] my-4 gap-4">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
            <div className="border-b sm:border-r border-zinc-800/60">
              <CoreVitalCard type="tbt" score={score(vitals.tbt)} />
            </div>
            <div className="border-b border-zinc-800/60">
              <CoreVitalCard type="fcp" score={score(vitals.fcp)} />
            </div>
            <div className="border-b sm:border-r border-zinc-800/60">
              <CoreVitalCard type="ttfb" score={score(vitals.ttfb)} />
            </div>
            <div className="border-b border-zinc-800/60">
              <CoreVitalCard type="tti" score={score(vitals.tti)} />
            </div>
            <div className="border-b sm:border-r sm:border-b-0 border-zinc-800/60">
              <CoreVitalCard type="dcl" score={score(vitals.dcl)} />
            </div>
            <div>
              <CoreVitalCard type="load" score={score(vitals.load)} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-center mx-6 p-8">
            <div className="text-xl font-bold">Resources & Samples</div>
            <p className="text-sm text-muted-foreground mt-2">
              Values above are the 75th percentile of page loads in the range
            </p>
            <div>
              <div className="flex justify-between my-8">
                <div>Average resources per page</div>
                <div>{vitals.resources ?? "-"}</div>
              </div>
              <div className="flex justify-between">
                <div>Page loads measured</div>
                <div>{vitals.samples}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default PerformanceDashboard;
