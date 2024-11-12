"use client";

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
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
const chartData = [
  { date: "2024-04-01", views: 222, visitors: 150 },
  { date: "2024-04-02", views: 97, visitors: 180 },
  { date: "2024-04-03", views: 167, visitors: 120 },
  { date: "2024-04-04", views: 242, visitors: 260 },
  { date: "2024-04-05", views: 373, visitors: 290 },
  { date: "2024-04-06", views: 301, visitors: 340 },
  { date: "2024-04-07", views: 245, visitors: 180 },
  { date: "2024-04-08", views: 409, visitors: 320 },
  { date: "2024-04-09", views: 59, visitors: 110 },
  { date: "2024-04-10", views: 261, visitors: 190 },
  { date: "2024-04-11", views: 327, visitors: 350 },
  { date: "2024-04-12", views: 292, visitors: 210 },
  { date: "2024-04-13", views: 342, visitors: 380 },
  { date: "2024-04-14", views: 137, visitors: 220 },
  { date: "2024-04-15", views: 120, visitors: 170 },
  { date: "2024-04-16", views: 138, visitors: 190 },
  { date: "2024-04-17", views: 446, visitors: 360 },
  { date: "2024-04-18", views: 364, visitors: 410 },
  { date: "2024-04-19", views: 243, visitors: 180 },
  { date: "2024-04-20", views: 89, visitors: 150 },
  { date: "2024-04-21", views: 137, visitors: 200 },
  { date: "2024-04-22", views: 224, visitors: 170 },
  { date: "2024-04-23", views: 138, visitors: 230 },
  { date: "2024-04-24", views: 387, visitors: 290 },
  { date: "2024-04-25", views: 215, visitors: 250 },
  { date: "2024-04-26", views: 75, visitors: 130 },
  { date: "2024-04-27", views: 383, visitors: 420 },
  { date: "2024-04-28", views: 122, visitors: 180 },
  { date: "2024-04-29", views: 315, visitors: 240 },
  { date: "2024-04-30", views: 454, visitors: 380 },
  { date: "2024-05-01", views: 165, visitors: 220 },
  { date: "2024-05-02", views: 293, visitors: 310 },
  { date: "2024-05-03", views: 247, visitors: 190 },
  { date: "2024-05-04", views: 385, visitors: 420 },
  { date: "2024-05-05", views: 481, visitors: 390 },
  { date: "2024-05-06", views: 498, visitors: 520 },
  { date: "2024-05-07", views: 388, visitors: 300 },
  { date: "2024-05-08", views: 149, visitors: 210 },
  { date: "2024-05-09", views: 227, visitors: 180 },
  { date: "2024-05-10", views: 293, visitors: 330 },
  { date: "2024-05-11", views: 335, visitors: 270 },
  { date: "2024-05-12", views: 197, visitors: 240 },
  { date: "2024-05-13", views: 197, visitors: 160 },
  { date: "2024-05-14", views: 448, visitors: 490 },
  { date: "2024-05-15", views: 473, visitors: 380 },
  { date: "2024-05-16", views: 338, visitors: 400 },
  { date: "2024-05-17", views: 499, visitors: 420 },
  { date: "2024-05-18", views: 315, visitors: 350 },
  { date: "2024-05-19", views: 235, visitors: 180 },
  { date: "2024-05-20", views: 177, visitors: 230 },
  { date: "2024-05-21", views: 82, visitors: 140 },
  { date: "2024-05-22", views: 81, visitors: 120 },
  { date: "2024-05-23", views: 252, visitors: 290 },
  { date: "2024-05-24", views: 294, visitors: 220 },
  { date: "2024-05-25", views: 201, visitors: 250 },
  { date: "2024-05-26", views: 213, visitors: 170 },
  { date: "2024-05-27", views: 420, visitors: 460 },
  { date: "2024-05-28", views: 233, visitors: 190 },
  { date: "2024-05-29", views: 78, visitors: 130 },
  { date: "2024-05-30", views: 340, visitors: 280 },
  { date: "2024-05-31", views: 178, visitors: 230 },
  { date: "2024-06-01", views: 178, visitors: 200 },
  { date: "2024-06-02", views: 470, visitors: 410 },
  { date: "2024-06-03", views: 103, visitors: 160 },
  { date: "2024-06-04", views: 439, visitors: 380 },
  { date: "2024-06-05", views: 88, visitors: 140 },
  { date: "2024-06-06", views: 294, visitors: 250 },
  { date: "2024-06-07", views: 323, visitors: 370 },
  { date: "2024-06-08", views: 385, visitors: 320 },
  { date: "2024-06-09", views: 438, visitors: 480 },
  { date: "2024-06-10", views: 155, visitors: 200 },
  { date: "2024-06-11", views: 92, visitors: 150 },
  { date: "2024-06-12", views: 492, visitors: 420 },
  { date: "2024-06-13", views: 81, visitors: 130 },
  { date: "2024-06-14", views: 426, visitors: 380 },
  { date: "2024-06-15", views: 307, visitors: 350 },
  { date: "2024-06-16", views: 371, visitors: 310 },
  { date: "2024-06-17", views: 475, visitors: 520 },
  { date: "2024-06-18", views: 0, visitors: 170 },
  { date: "2024-06-19", views: 341, visitors: 290 },
  { date: "2024-06-20", views: 408, visitors: 450 },
  { date: "2024-06-21", views: 169, visitors: 210 },
  { date: "2024-06-22", views: 317, visitors: 270 },
  { date: "2024-06-23", views: 480, visitors: 530 },
  { date: "2024-06-24", views: 132, visitors: 180 },
  { date: "2024-06-25", views: 141, visitors: 190 },
  { date: "2024-06-26", views: 434, visitors: 380 },
  { date: "2024-06-27", views: 0, visitors: 490 },
  { date: "2024-06-28", views: 149, visitors: 0 },
  { date: "2024-06-29", views: 103, visitors: 160 },
  { date: "2024-06-30", views: 446, visitors: 400 },
];

const chartConfig = {
  views: {
    label: "Views",
    color: "hsl(var(--chart-1))",
  },
  visitors: {
    label: "Visitors",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function Component() {
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("views");

  const total = React.useMemo(
    () => ({
      views: chartData.reduce((acc, curr) => acc + curr.views, 0),
      visitors: chartData.reduce((acc, curr) => acc + curr.visitors, 0),
    }),
    []
  );

  return (
    <Card className="">
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Page views and visitors</CardTitle>
          <CardDescription>
            Showing total views and visitors for the last 3 months
          </CardDescription>
        </div>
        <div className="flex">
          {["views", "visitors"].map((key) => {
            const chart = key as keyof typeof chartConfig;
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-xs text-muted-foreground">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg font-bold leading-none sm:text-3xl">
                  {total[key as keyof typeof total].toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[420px] w-full"
        >
          <LineChart
            accessibilityLayer
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
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                />
              }
            />
            <Line
              dataKey={activeChart}
              type="monotone"
              stroke={`var(--color-${activeChart})`}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
