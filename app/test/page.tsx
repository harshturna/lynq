"use client";

import { TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  { month: "/", desktop: 186, mobile: 80 },
  { month: "/dashboard", desktop: 305, mobile: 200 },
  { month: "/users", desktop: 237, mobile: 120 },
  { month: "/users/someId", desktop: 73, mobile: 190 },
  { month: "/", desktop: 186, mobile: 80 },
  { month: "/dashboard", desktop: 305, mobile: 200 },
  { month: "/users", desktop: 237, mobile: 120 },
  { month: "/users/someId", desktop: 73, mobile: 190 },
  { month: "/", desktop: 186, mobile: 80 },
  { month: "/dashboard", desktop: 305, mobile: 200 },
  { month: "/users", desktop: 237, mobile: 120 },
  { month: "/users/someId", desktop: 73, mobile: 190 },
  { month: "/", desktop: 186, mobile: 80 },
  { month: "/dashboard", desktop: 305, mobile: 200 },
  { month: "/users", desktop: 237, mobile: 120 },
  { month: "/users/someId", desktop: 73, mobile: 190 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
  label: {
    color: "hsl(var(--background))",
  },
} satisfies ChartConfig;

function Component() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bar Chart - Custom Label</CardTitle>
        <CardDescription>January - June 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="w-full h-[600px]">
          <BarChart
            barSize={50}
            // barGap={2}
            // compact
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              right: 16,
            }}
          >
            <YAxis
              dataKey="month"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
              hide
            />
            <XAxis dataKey="desktop" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar
              dataKey="desktop"
              layout="vertical"
              fill="var(--color-desktop)"
              radius={4}
            >
              <LabelList
                dataKey="month"
                position="insideLeft"
                offset={8}
                className="fill-[--color-label]"
                fontSize={12}
              />
              <LabelList
                dataKey="desktop"
                position="right"
                offset={8}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
  );
}

export default Component;