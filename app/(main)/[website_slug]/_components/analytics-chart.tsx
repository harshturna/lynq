"use client";

import { addDays, format, parseISO } from "date-fns";
import * as React from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Point } from "@/lib/dashboard-types";
import type { Granularity } from "@/lib/query/ranges";

const chartConfig = {
  views: { label: "Views", color: "hsl(var(--chart-1))" },
  sessions: { label: "Sessions", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

interface AnalyticsChartProps {
  series: { pageviews: Point[]; sessions: Point[] };
  granularity: Granularity;
  timeFrame: DatePickerValues;
  totals: { views: number; sessions: number };
}

/** Axis and tooltip labels per bucket size; buckets arrive zero-filled from the server. */
const formatters = (g: Granularity) => {
  switch (g) {
    case "hour":
      return {
        xAxis: (v: string) => format(parseISO(v), "h:mm a"),
        tooltip: (v: string) => format(parseISO(v), "MMM d, h:mm a"),
      };
    case "week":
      return {
        xAxis: (v: string) =>
          `${format(parseISO(v), "MMM d")} - ${format(addDays(parseISO(v), 6), "MMM d")}`,
        tooltip: (v: string) =>
          `${format(parseISO(v), "MMM d")} - ${format(addDays(parseISO(v), 6), "MMM d, yyyy")}`,
      };
    case "month":
      return {
        xAxis: (v: string) => format(parseISO(v), "MMM yyyy"),
        tooltip: (v: string) => format(parseISO(v), "MMMM yyyy"),
      };
    default:
      return {
        xAxis: (v: string) => format(parseISO(v), "MMM d"),
        tooltip: (v: string) => format(parseISO(v), "MMM d, yyyy"),
      };
  }
};

export function AnalyticsChart({
  series,
  granularity,
  timeFrame,
  totals,
}: AnalyticsChartProps) {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("views");

  const chartData = React.useMemo(() => {
    const sessionsByTime = new Map(series.sessions.map((p) => [p.t, p.v]));
    return series.pageviews.map((p) => ({
      date: p.t,
      views: p.v,
      sessions: sessionsByTime.get(p.t) ?? 0,
    }));
  }, [series]);

  const { xAxis: xAxisFormatter, tooltip: tooltipFormatter } = React.useMemo(
    () => formatters(granularity),
    [granularity]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>
            {activeChart === "views" ? "Page views" : "Sessions"}
          </CardTitle>
          <CardDescription>
            {timeFrame === "Today" ? "Today's traffic (24 hours)" : timeFrame}
          </CardDescription>
        </div>
        <div className="flex">
          {(["views", "sessions"] as const).map((key) => (
            <button
              type="button"
              key={key}
              data-active={activeChart === key}
              className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
              onClick={() => setActiveChart(key)}
            >
              <span className="text-xs text-muted-foreground">
                {chartConfig[key].label}
              </span>
              <span className="text-lg font-bold leading-none sm:text-3xl">
                {totals[key]}
              </span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[420px] w-full"
        >
          <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              minTickGap={granularity === "month" ? 20 : 18}
              tickFormatter={xAxisFormatter}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey={activeChart}
                  labelFormatter={tooltipFormatter}
                />
              }
            />
            <Line
              dataKey={activeChart}
              type="monotone"
              stroke="var(--color-views)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
