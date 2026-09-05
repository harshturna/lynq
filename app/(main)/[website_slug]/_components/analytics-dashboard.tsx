"use client";

import { ChartSpline, Eye, TimerIcon, User2 } from "lucide-react";
import { useMemo } from "react";
import type { DashboardData } from "@/lib/dashboard-types";
import { AnalyticsChart } from "./analytics-chart";
import DataCard from "./data-card";
import FilterChips from "./filter-chips";
import { useFilters } from "./filter-context";
import GlobeCard from "./globe-card";
import MetricCard from "./metric-card";

interface AnalyticsDashboardProps {
  data: DashboardData;
}

const percentChange = (current: number, previous: number): number | null => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  // No baseline to compare against: showing "+100%" from zero is noise
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

/** Engaged time arrives in milliseconds; the card has always shown minutes to two places. */
const minutes = (ms: number) => Number((ms / 60000).toFixed(2));

const AnalyticsDashboard = ({ data }: AnalyticsDashboardProps) => {
  const { filters } = useFilters();
  const { current, compare } = data.summary;

  // The comparison window is unfiltered on the server too, so deltas stay
  // meaningful with chips active; both sides carry the same filters.
  const deltas = useMemo(() => {
    if (!compare) return null;
    return {
      visitors: percentChange(current.visitors, compare.visitors),
      views: percentChange(current.pageviews, compare.pageviews),
      duration: percentChange(current.engaged_time, compare.engaged_time),
      bounce: percentChange(current.bounce_rate, compare.bounce_rate),
    };
  }, [current, compare]);

  const b = data.breakdowns;

  return (
    <div>
      <FilterChips />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
        <DataCard
          label="Visitors"
          description={
            filters.length
              ? "Unique visitors matching the filters"
              : "Total unique visitors to your website"
          }
          icon={User2}
          value={`${current.visitors}`}
          delta={deltas?.visitors}
        />
        <DataCard
          label="Views"
          description="Total views on all pages"
          icon={Eye}
          value={`${current.pageviews}`}
          delta={deltas?.views}
        />
        <DataCard
          label="Average Time"
          description="Average time visitors actively spend per session"
          icon={TimerIcon}
          value={`${minutes(current.engaged_time)} mins`}
          delta={deltas?.duration}
        />
        <DataCard
          label="Bounce Rate"
          description="Sessions with a single page, under ten seconds and no events"
          icon={ChartSpline}
          value={`${current.bounce_rate}%`}
          delta={deltas?.bounce}
          lowerIsBetter
        />
      </div>

      <div className="mt-4">
        <AnalyticsChart
          series={data.series}
          granularity={data.granularity}
          timeFrame={data.timeFrame}
          totals={{ views: current.pageviews, sessions: current.sessions }}
        />
      </div>

      <div className="mt-4">
        <GlobeCard countries={b.country.rows} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
        <MetricCard
          dimensions={[{ label: "Pages", key: "path", rows: b.path.rows }]}
        />
        <MetricCard
          dimensions={[
            { label: "Referrers", key: "referrer", rows: b.referrer.rows },
            { label: "Sources", key: "source", rows: b.source.rows },
          ]}
        />
        <MetricCard
          dimensions={[
            { label: "Devices", key: "device", rows: b.device.rows },
            { label: "Browsers", key: "browser", rows: b.browser.rows },
            { label: "OS", key: "os", rows: b.os.rows },
          ]}
        />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
