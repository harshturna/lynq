"use client";

import { getAnalytics, getCustomEventData, getVitals } from "@/lib/actions";
import DatePicker from "./date-picker";
import NavTabs from "./nav-tabs";
import { useState } from "react";
import ErrorAlert from "@/components/error";
import { useSearchParams } from "next/navigation";
import AnalyticsDashboard from "./analytics-dashboard";
import PerformanceDashboard from "./performance-dashboard";
import EventDashboard from "./event-dashboard";
import { Button } from "@/components/ui/button";
import SetupDialog from "./setup-dialog";

interface WebsiteDashboardProps {
  isFirstVisit: boolean;
  websiteName: string;
  websiteUrl: string;
  userId: string;
  initialAnalyticsData: AnalyticsDataWithCounts;
  initialPerformanceData: WebVitalsMetrics & { size: number };
  initialCustomEventData: GroupedCustomEventWithSessionData[];
}

const WebsiteDashboard = ({
  isFirstVisit,
  websiteName,
  websiteUrl,
  userId,
  initialAnalyticsData,
  initialPerformanceData,
  initialCustomEventData,
}: WebsiteDashboardProps) => {
  const [analyticsData, setAnalyticsData] = useState(initialAnalyticsData);
  const [perfData, setPerfData] = useState(initialPerformanceData);
  const [eventData, setEventData] = useState(initialCustomEventData);
  const [openSetupModal, setOpenSetupModal] = useState(false);
  const [error, setError] = useState<null | string>();
  const [timeFrame, setTimeFrame] = useState<DatePickerValues>("Last 30 days");
  const tab = useSearchParams().get("tab");

  async function getUpdatedData(pickedTimeFrame: DatePickerValues) {
    setError(null);
    const [analyticsResult, perfResult, eventResult] = await Promise.all([
      getAnalytics(pickedTimeFrame, websiteUrl, userId),
      getVitals(pickedTimeFrame, websiteUrl, userId),
      getCustomEventData(pickedTimeFrame, websiteUrl, userId),
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

    const { data: eventData, error: eventError } = eventResult;

    if (!eventData || eventError) {
      setError("Failed to get custom events");
      return;
    }

    setPerfData(perfData);
    setAnalyticsData(analyticsData);
    setEventData(eventData);
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
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <NavTabs />
        <DatePicker selectedTimeFrame={getUpdatedData} />
      </div>
      <div className="my-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-4xl">{websiteName}</h1>
          <p className="text-muted-foreground">{websiteUrl}</p>
        </div>
        <div>
          <Button variant="outline" onClick={() => setOpenSetupModal(true)}>
            Configuration
          </Button>
        </div>
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
      {tab === "events" && <EventDashboard events={eventData} />}
      <SetupDialog
        title="Add Script"
        siteUrl={websiteUrl}
        open={isFirstVisit || openSetupModal}
        setOpen={setOpenSetupModal}
      />
    </main>
  );
};

export default WebsiteDashboard;
