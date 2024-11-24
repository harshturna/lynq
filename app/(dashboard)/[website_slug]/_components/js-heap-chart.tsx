"use client";

import * as React from "react";
import { Label, Pie, PieChart } from "recharts";

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
import { convertByteToMB } from "@/lib/utils";

const chartConfig = {
  total: {
    label: "Total",
    color: "hsl(var(--chart-1))",
  },
  used: {
    label: "Used",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

interface JsHeapChartProps {
  total: number;
  used: number;
}

const JsHeapChart = ({ total, used }: JsHeapChartProps) => {
  const [totalMB, usedMb] = [convertByteToMB(total), convertByteToMB(used)];

  const chartData = [
    {
      browser: "total",
      visitors: totalMB,
      fill: "var(--color-total)",
    },
    {
      browser: "used",
      visitors: usedMb,
      fill: "var(--color-used)",
    },
  ];
  return (
    <Card className="flex flex-col bg-transparent border-none">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-xl">JavaScript Heap</CardTitle>
        <CardDescription>Total JS heap used</CardDescription>
      </CardHeader>
      {totalMB <= 0 && usedMb <= 0 ? (
        <div className="text-center mx-auto my-6 font-bold w-[200px] h-[200px] rounded-[50%] border-[38px] border-white relative">
          <span className="absolute top-[35%] left-[27%] text-sm">
            No Data
            <br /> Available
          </span>
        </div>
      ) : (
        <CardContent className="flex-1 pb-0">
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={chartData}
                dataKey="visitors"
                nameKey="browser"
                innerRadius={60}
              >
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-4xl font-bold"
                          >
                            MB
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 24}
                            className="fill-muted-foreground"
                          >
                            (size)
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
      )}
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          {usedMb} MB of {totalMB} MB used
        </div>
      </CardFooter>
    </Card>
  );
};

export default JsHeapChart;
