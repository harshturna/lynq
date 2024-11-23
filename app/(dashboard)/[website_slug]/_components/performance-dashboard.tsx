import CoreVitalCard from "./core-vital-card";
import { getVitals } from "@/lib/actions";
import ErrorAlert from "@/components/error";

interface PerformanceDashboardProps {
  performanceData: WebVitalsMetrics & { size: number };
  timeFrame: DatePickerValues;
}

const PerformanceDashboard = ({
  performanceData,
  timeFrame,
}: PerformanceDashboardProps) => {
  return (
    <div className="flex gap-4 flex-wrap">
      <CoreVitalCard type="lcp" score={performanceData.lcp} />
      <CoreVitalCard type="inp" score={performanceData.inp} />
      <CoreVitalCard type="cls" score={performanceData.cls} />
    </div>
  );
};

export default PerformanceDashboard;
