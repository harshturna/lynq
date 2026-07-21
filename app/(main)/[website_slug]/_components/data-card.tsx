"use client";

import { Hint } from "@/components/hint";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import React from "react";

interface DataCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  description: string;
  /** Percent change vs the previous period; omitted while filters are active */
  delta?: number | null;
  /** true when a lower number is the better outcome (bounce rate) */
  lowerIsBetter?: boolean;
  /** Per-bucket values for the period, rendered as a background sparkline */
  trend?: number[];
}

const Sparkline = ({ points }: { points: number[] }) => {
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const width = 100;
  const height = 28;

  const path = points
    .map((point, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((point - min) / range) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="absolute bottom-0 left-0 h-10 w-full opacity-40"
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(6 182 212)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(6 182 212)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L${width},${height} L0,${height} Z`}
        fill="url(#sparkFill)"
      />
      <path
        d={path}
        fill="none"
        stroke="rgb(6 182 212)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

const DataCard = ({
  label,
  description,
  icon: Icon,
  value,
  delta,
  lowerIsBetter = false,
  trend,
}: DataCardProps) => {
  const hasDelta = typeof delta === "number" && Number.isFinite(delta);
  const rising = hasDelta && delta > 0;
  // "Good" depends on the metric — a rising bounce rate is bad news
  const positive = hasDelta && (lowerIsBetter ? delta < 0 : delta > 0);

  return (
    <Hint label={description}>
      <div className="group/card relative">
        <Card className="py-2 overflow-hidden relative">
          {trend && trend.length > 1 && <Sparkline points={trend} />}
          <CardHeader className="relative">
            <div className="flex justify-between text-sm mb-2">
              {label}
              <Icon width={15} height={15} />
            </div>
          </CardHeader>
          <CardContent className="relative flex items-end justify-between gap-2">
            <span className="text-4xl text-cyan-500/80 font-bold">{value}</span>
            {hasDelta && delta !== 0 && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-medium mb-1 shrink-0",
                  positive ? "text-emerald-400/90" : "text-red-400/90"
                )}
              >
                {rising ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(delta).toFixed(1)}%
              </span>
            )}
          </CardContent>
        </Card>
        <>
          <span className="absolute h-px w-full -bottom-px inset-x-0 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></span>
        </>
      </div>
    </Hint>
  );
};

export default DataCard;
