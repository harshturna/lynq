"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ErrorAlert from "@/components/error";
import { Button } from "@/components/ui/button";
import { getDashboard } from "@/lib/dashboard";
import type { DashboardData } from "@/lib/dashboard-types";
import AnalyticsDashboard from "./analytics-dashboard";
import DatePicker from "./date-picker";
import EventDashboard from "./event-dashboard";
import { FilterProvider, useFilters } from "./filter-context";
import NavTabs from "./nav-tabs";
import PerformanceDashboard from "./performance-dashboard";
import SetupDialog from "./setup-dialog";

interface WebsiteDashboardProps {
  websiteName: string;
  websiteUrl: string;
  initialData: DashboardData;
}

/**
 * Holds the loaded aggregates and refetches them whenever the range or the
 * filter chips change. Everything it renders is computed by lib/query on the
 * server; the client only draws (TICKET-023).
 */
const DashboardBody = ({
  websiteName,
  websiteUrl,
  initialData,
}: WebsiteDashboardProps) => {
  const [data, setData] = useState(initialData);
  const [timeFrame, setTimeFrame] = useState<DatePickerValues>(
    initialData.timeFrame
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [openSetupModal, setOpenSetupModal] = useState(false);
  const tab = useSearchParams().get("tab");
  const { filters } = useFilters();
  const requestId = useRef(0);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const id = ++requestId.current;
    setError(null);
    setIsLoading(true);
    getDashboard(websiteUrl, timeFrame, filters)
      .then(({ data: next, error: message }) => {
        if (id !== requestId.current) return; // a newer request superseded this one
        if (!next || message) setError(message ?? "Failed to load analytics");
        else setData(next);
      })
      .catch(() => {
        if (id === requestId.current) setError("Failed to load analytics");
      })
      .finally(() => {
        if (id === requestId.current) setIsLoading(false);
      });
  }, [websiteUrl, timeFrame, filters]);

  return (
    <main className="mb-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
        <NavTabs />
        <DatePicker selectedTimeFrame={setTimeFrame} isLoading={isLoading} />
      </div>
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
        {(!tab || tab === "analytics") && <AnalyticsDashboard data={data} />}
        {tab === "performance" && <PerformanceDashboard vitals={data.vitals} />}
        {tab === "events" && <EventDashboard events={data.events} />}
      </div>
      <SetupDialog
        title="Add Script"
        siteUrl={websiteUrl}
        open={openSetupModal}
        setClose={() => {
          setOpenSetupModal(false);
        }}
      />
    </main>
  );
};

const WebsiteDashboard = (props: WebsiteDashboardProps) => (
  <FilterProvider>
    <DashboardBody {...props} />
  </FilterProvider>
);

export default WebsiteDashboard;
