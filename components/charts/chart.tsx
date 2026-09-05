"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChartSkeleton } from "@/components/shell/skeleton";
import type { ChartOption, EChartsInstance } from "@/lib/charts/echarts";
import { cn } from "@/lib/utils";

/**
 * The one component that owns an ECharts instance (design §7, D-009). Renders
 * a figure with the title, a generated description and the caller's table
 * equivalent in the server HTML; the chart itself loads after hydration and
 * paints over a skeleton of the same height. The SVG is aria-hidden: the
 * description and the table are the accessible representation.
 */
export type MarkClick = {
  seriesName: string;
  name: string;
  dataIndex: number;
  value: unknown;
};

export function Chart({
  option,
  height,
  title,
  description,
  table,
  onMarkClick,
  onMarkHover,
  className,
}: {
  option: ChartOption;
  height: number;
  /** Visible or visually hidden title for the figure. */
  title: string;
  /** One sentence describing the data (design §7). */
  description: string;
  /** The table equivalent (rule 8), usually a HiddenTable. */
  table?: React.ReactNode;
  onMarkClick?: (mark: MarkClick) => void;
  onMarkHover?: (mark: MarkClick | null) => void;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const instance = useRef<EChartsInstance | null>(null);
  const [ready, setReady] = useState(false);
  const id = useId();
  const clickRef = useRef(onMarkClick);
  const hoverRef = useRef(onMarkHover);
  clickRef.current = onMarkClick;
  hoverRef.current = onMarkHover;

  useEffect(() => {
    let disposed = false;
    let ro: ResizeObserver | null = null;
    import("@/lib/charts/echarts").then(({ setupEcharts }) => {
      if (disposed || !host.current) return;
      const echarts = setupEcharts();
      const chart = echarts.init(host.current, "lynq", { renderer: "svg" });
      instance.current = chart;
      chart.on("click", (p) => clickRef.current?.(pick(p)));
      chart.on("mouseover", (p) => hoverRef.current?.(pick(p)));
      chart.on("mouseout", () => hoverRef.current?.(null));
      ro = new ResizeObserver(() => chart.resize());
      ro.observe(host.current);
      setReady(true);
    });
    return () => {
      disposed = true;
      ro?.disconnect();
      instance.current?.dispose();
      instance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !instance.current) return;
    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    instance.current.setOption(
      { ...option, animation: reduced ? false : (option.animation ?? true) },
      { notMerge: true }
    );
  }, [option, ready]);

  return (
    <figure
      aria-labelledby={`${id}-t`}
      aria-describedby={`${id}-d`}
      className={cn("relative m-0", className)}
    >
      <figcaption id={`${id}-t`} className="sr-only">
        {title}
      </figcaption>
      <p id={`${id}-d`} className="sr-only">
        {description}
      </p>
      <div className="relative" style={{ height }}>
        {!ready && (
          <div className="absolute inset-0">
            <ChartSkeleton height={height} />
          </div>
        )}
        <div
          ref={host}
          aria-hidden
          style={{ height }}
          className={cn("w-full", !ready && "invisible")}
        />
      </div>
      {table}
    </figure>
  );
}

function pick(p: unknown): MarkClick {
  const e = p as {
    seriesName?: string;
    name?: string;
    dataIndex?: number;
    value?: unknown;
  };
  return {
    seriesName: e.seriesName ?? "",
    name: e.name ?? "",
    dataIndex: e.dataIndex ?? -1,
    value: e.value,
  };
}
