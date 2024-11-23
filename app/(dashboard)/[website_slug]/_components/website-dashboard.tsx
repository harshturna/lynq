"use client";

import { getAnalytics, getVitals } from "@/lib/actions";
import DatePicker from "./date-picker";
import NavTabs from "./nav-tabs";
import { useState } from "react";
import ErrorAlert from "@/components/error";
import { useSearchParams } from "next/navigation";
import AnalyticsDashboard from "./analytics-dashboard";
import PerformanceDashboard from "./performance-dashboard";

interface WebsiteDashboardProps {
  websiteName: string;
  websiteUrl: string;
  userId: string;
  initialAnalyticsData: AnalyticsDataWithCounts;
  initialPerformanceData: WebVitalsMetrics & { size: number };
}

const WebsiteDashboard = ({
  websiteName,
  websiteUrl,
  userId,
  initialAnalyticsData,
  initialPerformanceData,
}: WebsiteDashboardProps) => {
  const [analyticsData, setAnalyticsData] = useState(initialAnalyticsData);
  const [perfData, setPerfData] = useState(initialPerformanceData);
  const [error, setError] = useState<null | string>();
  const [timeFrame, setTimeFrame] = useState<DatePickerValues>("Today");
  const tab = useSearchParams().get("tab");

  async function getUpdatedData(pickedTimeFrame: DatePickerValues) {
    setError(null);
    const [analyticsResult, perfResult] = await Promise.all([
      getAnalytics(pickedTimeFrame, websiteUrl, userId),
      getVitals(pickedTimeFrame, websiteUrl, userId),
    ]);

    const { res: analyticsData, error: analyticsError } = analyticsResult;
    if (!analyticsData || analyticsError) {
      setError("Failed to get analytics data");
      return;
    }

    const { data: perfData, error: perfError } = perfResult;
    if (!perfData || perfError) {
      setError("Failed to get performance data");
      return;
    }

    setPerfData(perfData);
    setAnalyticsData(analyticsData);
    setTimeFrame(pickedTimeFrame);
  }

  if (error) {
    return (
      <ErrorAlert
        title={error}
        description="Ran into an error while getting the data, try refreshing the page"
      />
    );
  }

  return (
    <main className="mb-4">
      <div className="flex justify-between items-center">
        <NavTabs />
        <DatePicker selectedTimeFrame={getUpdatedData} />
      </div>
      <div className="my-8">
        <h1 className="text-2xl md:text-4xl">{websiteName}</h1>
        <p className="text-muted-foreground">{websiteUrl}</p>
      </div>
      {(!tab || tab === "analytics") && (
        <AnalyticsDashboard
          analyticsData={analyticsData}
          timeFrame={timeFrame}
        />
      )}
      {tab === "performance" && (
        <PerformanceDashboard
          performanceData={perfData}
          timeFrame={timeFrame}
        />
      )}
    </main>
  );
};

export default WebsiteDashboard;
