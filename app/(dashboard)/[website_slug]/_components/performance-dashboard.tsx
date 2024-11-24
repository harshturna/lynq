import CoreVitalCard from "./core-vital-card";
import { getVitals } from "@/lib/actions";
import ErrorAlert from "@/components/error";
import { Card } from "@/components/ui/card";
import JsHeapChart from "./js-heap-chart";

interface PerformanceDashboardProps {
  performanceData: WebVitalsMetrics & { size: number };
  timeFrame: DatePickerValues;
}

const PerformanceDashboard = ({
  performanceData,
  timeFrame,
}: PerformanceDashboardProps) => {
  const allExceptCoreVitals = Object.keys(performanceData).reduce<
    Partial<WebVitalsMetrics>
  >((acc, key) => {
    if (
      key !== "lcp" &&
      key !== "inp" &&
      key !== "cls" &&
      key !== "size" &&
      key !== "resource_count" &&
      key !== "interaction_count" &&
      key !== "total_js_heap" &&
      key !== "used_js_heap"
    ) {
      acc[key as keyof WebVitalsMetrics & "size"] =
        performanceData[key as keyof WebVitalsMetrics & "size"];
    }
    return acc;
  }, {});

  return (
    <>
      <div className="md:grid grid-cols-3 gap-4 flex-wrap">
        <CoreVitalCard type="lcp" score={performanceData.lcp} isCore />
        <CoreVitalCard type="inp" score={performanceData.inp} isCore />
        <CoreVitalCard type="cls" score={performanceData.cls} isCore />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_620px] my-4 gap-4">
        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 p-4">
            <div className="border-b sm:border-r border-zinc-800/60">
              <CoreVitalCard type="tbt" score={performanceData.tbt} />
            </div>
            <div className="border-b border-zinc-800/60">
              <CoreVitalCard type="fcp" score={performanceData.fcp} />
            </div>
            <div className="border-b sm:border-r border-zinc-800/60">
              <CoreVitalCard type="ttfb" score={performanceData.ttfb} />
            </div>
            <div className="border-b border-zinc-800/60">
              <CoreVitalCard type="tti" score={performanceData.tti} />
            </div>
            <div className="border-b sm:border-r sm:border-b-0 border-zinc-800/60">
              <CoreVitalCard type="dcl" score={performanceData.dcl} />
            </div>
            <div>
              <CoreVitalCard type="load" score={performanceData.load} />
            </div>
          </div>
        </Card>
        <Card>
          <div>
            <JsHeapChart
              total={performanceData.total_js_heap}
              used={performanceData.used_js_heap}
            />
          </div>
          <div className="text-center border-t border-stone-800 mx-6 mt-4 p-8">
            <div className="text-xl font-bold">Resources & Interactions</div>
            <div>
              <div className="flex justify-between my-8">
                <div>Resource Count</div>
                <div>
                  {performanceData.resource_count === -1
                    ? "-"
                    : performanceData.resource_count}
                </div>
              </div>
              <div className="flex justify-between">
                <div>Interaction Count</div>
                <div>
                  {performanceData.interaction_count === -1
                    ? "-"
                    : performanceData.interaction_count}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default PerformanceDashboard;
