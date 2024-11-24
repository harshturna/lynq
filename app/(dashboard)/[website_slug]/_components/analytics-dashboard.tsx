import { AnalyticsChart } from "./analytics-chart";
import DataCard from "./data-card";
import { ChartSpline, Eye, TimerIcon, User2 } from "lucide-react";
import AnalyticsDataViewer from "./analytics-data-viewer";

interface AnalyticsDashboardProps {
  analyticsData: AnalyticsDataWithCounts;
  timeFrame: DatePickerValues;
}

const AnalyticsDashboard = ({
  analyticsData,
  timeFrame,
}: AnalyticsDashboardProps) => {
  return (
    <div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
        <DataCard
          label="Visitors"
          description="Total unique visitors to your website"
          icon={User2}
          value={`${analyticsData.visitors_count}`}
        />
        <DataCard
          label="Views"
          description="Total views on all pages"
          icon={Eye}
          value={`${analyticsData.views_count}`}
        />
        <DataCard
          label="Average Time"
          description="Average time users spend on your website"
          icon={TimerIcon}
          value={`${analyticsData.average_session_duration} ${
            analyticsData.average_session_duration < 1 ? "s" : "m"
          }`}
        />
        <DataCard
          label="Bounce Rate"
          description="Percentage of users who quickly leave your site"
          icon={ChartSpline}
          value={`${analyticsData.bounce_rate}%`}
        />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_650px] gap-4 mt-4">
        <div className="w-full">
          <AnalyticsChart
            analyticsData={analyticsData.analyticsData}
            sessionData={analyticsData.sessionData}
            selectedTimeFrame={timeFrame}
          />
        </div>
        <AnalyticsDataViewer analyticsDataWithCount={analyticsData} />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
