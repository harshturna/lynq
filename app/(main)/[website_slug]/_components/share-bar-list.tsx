"use client";

import { useState } from "react";
import { groupByAnalytics } from "@/lib/utils";
import { countryFlag } from "@/lib/geo/country-centroids";
import { useFilters } from "./filter-context";
import { cn } from "@/lib/utils";

interface ShareBarListProps {
  data: AnalyticsDataWithSessionData[];
  groupBy: AnalyticsGroupBy;
  /** Rows shown before "Show all" is clicked */
  limit?: number;
  emptyLabel?: string;
}

const DEFAULT_LIMIT = 6;

const labelFor = (groupBy: AnalyticsGroupBy, group: string) => {
  if (group === "Ios") return "iOS";
  if (groupBy === "countries") {
    const flag = countryFlag(group);
    return flag ? `${flag}  ${group}` : group;
  }
  return group;
};

const ShareBarList = ({
  data,
  groupBy,
  limit = DEFAULT_LIMIT,
  emptyLabel = "No data for this period",
}: ShareBarListProps) => {
  const [expanded, setExpanded] = useState(false);
  const { toggleFilter, isActive } = useFilters();

  const grouped = groupByAnalytics(groupBy, data) ?? [];
  // Share is relative to the top row, not the total — it makes the long tail
  // legible instead of collapsing every minor row into an invisible sliver
  const max = grouped.length ? grouped[0].count : 0;
  const total = grouped.reduce((sum, item) => sum + item.count, 0);

  if (!grouped.length) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        {emptyLabel}
      </p>
    );
  }

  const visible = expanded ? grouped : grouped.slice(0, limit);

  return (
    <div className="px-2">
      {visible.map((item) => {
        const group = String(item.group);
        const active = isActive({ dimension: groupBy, value: group });
        const share = max ? (item.count / max) * 100 : 0;
        const percent = total ? Math.round((item.count / total) * 100) : 0;

        return (
          <button
            key={group}
            type="button"
            onClick={() => toggleFilter({ dimension: groupBy, value: group })}
            aria-pressed={active}
            title={`${group} — ${item.count} (${percent}%)`}
            className={cn(
              "relative w-full group/row flex items-center justify-between",
              "px-3 py-2 my-0.5 rounded-md text-sm overflow-hidden",
              "transition-colors hover:bg-stone-900/60",
              active && "bg-stone-900/80 ring-1 ring-cyan-500/40"
            )}
          >
            {/* Share bar sits behind the label */}
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-0 left-0 rounded-md transition-all duration-500",
                active ? "bg-cyan-500/25" : "bg-cyan-500/10"
              )}
              style={{ width: `${share}%` }}
            />
            <span className="relative truncate text-left text-muted-foreground group-hover/row:text-foreground">
              {labelFor(groupBy, group)}
            </span>
            <span className="relative flex items-center gap-3 pl-3 shrink-0 tabular-nums">
              <span className="text-xs text-muted-foreground/70">
                {percent}%
              </span>
              <span className="font-medium">{item.count}</span>
            </span>
          </button>
        );
      })}

      {grouped.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 mt-1"
        >
          {expanded ? "Show less" : `Show all ${grouped.length}`}
        </button>
      )}
    </div>
  );
};

export default ShareBarList;
