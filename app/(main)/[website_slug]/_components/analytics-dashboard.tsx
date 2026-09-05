"use client";

import { ChartSpline, Eye, TimerIcon, User2 } from "lucide-react";
import { useMemo } from "react";
import {
  applyFilters,
  calculateAverageSessionDuration,
  calculateBounceRate,
  countDistinctVisitors,
} from "@/lib/utils";
import { AnalyticsChart } from "./analytics-chart";
import DataCard from "./data-card";
import FilterChips from "./filter-chips";
import { useFilters } from "./filter-context";
import GlobeCard from "./globe-card";
import MetricCard from "./metric-card";

interface AnalyticsDashboardProps {
  analyticsData: AnalyticsDataWithCounts;
  timeFrame: DatePickerValues;
  comparison?: PeriodSummary | null;
}

const percentChange = (current: number, previous: number): number | null => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  // No baseline to compare against — showing "+100%" from zero is noise
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

const AnalyticsDashboard = ({
  analyticsData,
  timeFrame,
  comparison,
}: AnalyticsDashboardProps) => {
  const { filters } = useFilters();
  const isFiltered = filters.length > 0;

  const rows = analyticsData.analyticsData;

  const filteredRows = useMemo(
    () => applyFilters(rows, filters),
    [rows, filters]
  );

  // Sessions are filtered on the dimensions they actually carry (country,
  // device, browser, OS); page/referrer filters are handled by narrowing the
  // page-view rows and intersecting on session_id below.
  const filteredSessions = useMemo(() => {
    if (!isFiltered) return analyticsData.sessionData;
    const sessionIds = new Set(filteredRows.map((row) => row.session_id));
    return analyticsData.sessionData.filter((session) =>
      sessionIds.has(session.session_id)
    );
  }, [analyticsData.sessionData, filteredRows, isFiltered]);

  // Unfiltered, prefer the exact server-side counts — they're accurate beyond
  // the 5000-row cap that the client-side array is subject to.
  const stats = useMemo(() => {
    if (!isFiltered) {
      return {
        visitors: analyticsData.visitors_count,
        views: analyticsData.views_count,
        duration: analyticsData.average_session_duration,
        bounce: analyticsData.bounce_rate,
      };
    }
    return {
      visitors: countDistinctVisitors(filteredRows),
      views: filteredRows.length,
      duration: calculateAverageSessionDuration(filteredSessions),
      bounce: calculateBounceRate(filteredSessions),
    };
  }, [isFiltered, analyticsData, filteredRows, filteredSessions]);

  // Deltas compare against an unfiltered previous period, so showing them
  // alongside an active filter would be misleading.
  const deltas = useMemo(() => {
    if (isFiltered || !comparison) return null;
    return {
      visitors: percentChange(stats.visitors, comparison.visitors_count),
      views: percentChange(stats.views, comparison.views_count),
      duration: percentChange(
        stats.duration,
        comparison.average_session_duration
      ),
      bounce: percentChange(stats.bounce, comparison.bounce_rate),
    };
  }, [isFiltered, comparison, stats]);

  return (
    <div>
      <FilterChips />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
        <DataCard
          label="Visitors"
          description="Total unique visitors to your website"
          icon={User2}
          value={`${stats.visitors}`}
          delta={deltas?.visitors}
        />
        <DataCard
          label="Views"
          description="Total views on all pages"
          icon={Eye}
          value={`${stats.views}`}
          delta={deltas?.views}
        />
        <DataCard
          label="Average Time"
          description="Average time users spend on your website"
          icon={TimerIcon}
          value={`${stats.duration} mins`}
          delta={deltas?.duration}
        />
        <DataCard
          label="Bounce Rate"
          description="Percentage of users who quickly leave your site"
          icon={ChartSpline}
          value={`${stats.bounce}%`}
          delta={deltas?.bounce}
          lowerIsBetter
        />
      </div>

      {/* Chart gets the full width — it's the primary artifact, and was
          previously squeezed beside a fixed 650px panel */}
      <div className="mt-4">
        <AnalyticsChart
          analyticsData={filteredRows}
          sessionData={filteredSessions}
          selectedTimeFrame={timeFrame}
        />
      </div>

      <div className="mt-4">
        <GlobeCard data={filteredRows} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
        <MetricCard
          data={filteredRows}
          dimensions={[{ label: "Pages", groupBy: "pages" }]}
        />
        <MetricCard
          data={filteredRows}
          dimensions={[{ label: "Referrers", groupBy: "referrers" }]}
        />
        <MetricCard
          data={filteredRows}
          dimensions={[
            { label: "Devices", groupBy: "devices" },
            { label: "Browsers", groupBy: "browsers" },
            { label: "OS", groupBy: "operating_systems" },
          ]}
        />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
