"use client";

import * as React from "react";
import { BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  getFormatters,
  process12MonthsData,
  process24HourData,
  process30DaysData,
  process3MonthsData,
  process7DaysData,
} from "@/lib/utils";

const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--chart-1))",
  },
  sessions: {
    label: "Sessions",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface AnalyticsChartProps {
  analyticsData: AnalyticsData[];
  sessionData: SessionData[];
  selectedTimeFrame: DatePickerValues;
}

export function AnalyticsChart({
  analyticsData,
  sessionData,
  selectedTimeFrame,
}: AnalyticsChartProps) {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("sessions");
  const chartData = React.useMemo(() => {
    if (selectedTimeFrame === "Today") {
      return process24HourData(analyticsData, sessionData, activeChart);
    } else if (selectedTimeFrame === "Last 7 days") {
      return process7DaysData(analyticsData, sessionData, activeChart);
    } else if (selectedTimeFrame === "Last 30 days") {
      return process30DaysData(analyticsData, sessionData, activeChart);
    } else if (selectedTimeFrame === "Last 3 months") {
      return process3MonthsData(analyticsData, sessionData, activeChart);
    } else if (selectedTimeFrame === "Last 12 months") {
      return process12MonthsData(analyticsData, sessionData, activeChart);
    }
    return [];
  }, [analyticsData, sessionData, selectedTimeFrame, activeChart]);

  const { xAxis: xAxisFormatter, tooltip: tooltipFormatter } = React.useMemo(
    () => getFormatters(selectedTimeFrame),
    [selectedTimeFrame]
  );

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>
            {activeChart === "views" ? "Page views" : "Sessions"}
          </CardTitle>
          <CardDescription>
            {selectedTimeFrame === "Today"
              ? "Today's traffic (24 hours)"
              : selectedTimeFrame}
          </CardDescription>
        </div>
        <div className="flex">
          <button
            key={"views"}
            data-active={activeChart === "views"}
            className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
            onClick={() => setActiveChart("views")}
          >
            <span className="text-xs text-muted-foreground">Views</span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {analyticsData.length}
            </span>
          </button>
          <button
            key={"sessions"}
            data-active={activeChart === "sessions"}
            className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
            onClick={() => setActiveChart("sessions")}
          >
            <span className="text-xs text-muted-foreground">Sessions</span>
            <span className="text-lg font-bold leading-none sm:text-3xl">
              {sessionData.length}
            </span>
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[420px] w-full"
        >
          <LineChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              minTickGap={selectedTimeFrame === "Last 12 months" ? 20 : 0}
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
              stroke={`var(--color-views)`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
