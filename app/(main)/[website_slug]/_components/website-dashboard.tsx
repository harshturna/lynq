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
  const [isLoading, setIsLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState<DatePickerValues>("Last 30 days");
  const tab = useSearchParams().get("tab");
  const [isUserFirstVisit, setIsUserFirstVisit] = useState(isFirstVisit);

  const handleSetupModalClose = () => {
    setIsUserFirstVisit(false);
    setOpenSetupModal(false);
  };

  async function getUpdatedData(pickedTimeFrame: DatePickerValues) {
    setError(null);
    setIsLoading(true);

    try {
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
    } catch {
      setError("Failed to get the data");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mb-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <NavTabs />
        <DatePicker selectedTimeFrame={getUpdatedData} isLoading={isLoading} />
      </div>
      {/* Rendered inline rather than replacing the dashboard, so the date
          picker stays mounted and the user can retry another range */}
      {error && (
        <div className="mt-4">
          <ErrorAlert
            title={error}
            description="Ran into an error while getting the data, try another range or refresh the page"
          />
        </div>
      )}
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
      <div
        className={
          isLoading
            ? "pointer-events-none opacity-50 transition-opacity duration-200"
            : "transition-opacity duration-200"
        }
        aria-busy={isLoading}
      >
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
      </div>
      <SetupDialog
        title="Add Script"
        siteUrl={websiteUrl}
        open={isUserFirstVisit || openSetupModal}
        setClose={handleSetupModalClose}
      />
    </main>
  );
};

export default WebsiteDashboard;
