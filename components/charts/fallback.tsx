"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Threshold } from "@/lib/charts/thresholds";

/**
 * Renders a lead view only when its threshold passes (design §12). The
 * threshold takes the measured container width (null before the first
 * measurement, when only the count part is checked) so a treemap or
 * heatmap gives way to one sentence on narrow screens. The screen's table
 * is outside this component and stays where it is.
 */
export function ChartOrFallback({
  check,
  children,
  className,
}: {
  check: (width: number | null) => Threshold;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (typeof w === "number") setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const result = check(width);
  return (
    <div ref={ref} className={className}>
      {result.ok ? (
        children
      ) : (
        <p className="py-6 text-center text-[13px] text-mute">
          {result.reason}
        </p>
      )}
    </div>
  );
}
