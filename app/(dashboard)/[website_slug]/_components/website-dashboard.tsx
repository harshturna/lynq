"use client";

import { getAnalytics } from "@/lib/actions";
import AnalyticsDataViewer from "./analytics-data-viewer";
import DatePicker from "./date-picker";
import NavTabs from "./nav-tabs";
import { useState } from "react";
import SetupDialog from "./setup-dialog";
import DataCard from "./data-card";
import { ChartSpline, Eye, TimerIcon, User2, View } from "lucide-react";
import ErrorAlert from "@/components/error";

interface WebsiteDashboardProps {
  websiteName: string;
  websiteUrl: string;
  userId: string;
  initialAnalyticsData: AnalyticsDataWithCounts;
}

const WebsiteDashboard = ({
  websiteName,
  websiteUrl,
  userId,
  initialAnalyticsData,
}: WebsiteDashboardProps) => {
  const [analyticsData, setAnalyticsData] = useState(initialAnalyticsData);
  const [error, setError] = useState<null | string>();

  async function getUpdatedAnalyticsData(pickedTimeFrame: DatePickerValues) {
    const { res: analyticsData, error: analyticsError } = await getAnalytics(
      pickedTimeFrame,
      websiteUrl,
      userId
    );

    if (!analyticsData || analyticsError) {
      setError("Unable to fetch data");
      return;
    }

    setAnalyticsData(analyticsData);
  }

  if (error) {
    return (
      <ErrorAlert
        title="Failed to get analytics"
        description="Ran into an error while getting the data, try refreshing the page"
      />
    );
  }

  return (
    <main className="mb-4">
      <div className="flex justify-between items-center">
        <NavTabs />
        <DatePicker selectedTimeFrame={getUpdatedAnalyticsData} />
      </div>
      <div className="my-8">
        <h1 className="text-2xl md:text-4xl">{websiteName}</h1>
        <p className="text-muted-foreground">{websiteUrl}</p>
      </div>
      <div className="flex flex-wrap gap-4 my-4">
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
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_580px] gap-2">
        <div className="w-full bg-green-500">something something</div>
        <AnalyticsDataViewer analyticsDataWithCount={analyticsData} />
      </div>
    </main>
  );
};

export default WebsiteDashboard;
