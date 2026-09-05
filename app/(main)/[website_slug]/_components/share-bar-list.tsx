"use client";

import { useState } from "react";
import type { BreakdownKey, Row } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";
import { displayValue } from "./filter-chips";
import { useFilters } from "./filter-context";

interface ShareBarListProps {
  /** Ranked rows for one dimension, as returned by lib/query's breakdown. */
  rows: Row[];
  groupBy: BreakdownKey;
  /** Rows shown before "Show all" is clicked */
  limit?: number;
  emptyLabel?: string;
}

const DEFAULT_LIMIT = 6;

const ShareBarList = ({
  rows,
  groupBy,
  limit = DEFAULT_LIMIT,
  emptyLabel = "No data for this period",
}: ShareBarListProps) => {
  const [expanded, setExpanded] = useState(false);
  const { toggleFilter, isActive } = useFilters();

  // Share is relative to the top row, not the total — it makes the long tail
  // legible instead of collapsing every minor row into an invisible sliver
  const max = rows.length ? rows[0].metric : 0;
  const total = rows.reduce((sum, row) => sum + row.metric, 0);

  if (!rows.length) {
    return (
      <p className="text-center text-sm text-muted-foreground py-10">
        {emptyLabel}
      </p>
    );
  }

  const visible = expanded ? rows : rows.slice(0, limit);

  return (
    <div className="px-2">
      {visible.map((row) => {
        const label = displayValue(groupBy, row.value);
        const active = isActive({ dimension: groupBy, value: row.value });
        const share = max ? (row.metric / max) * 100 : 0;
        const percent = total ? Math.round((row.metric / total) * 100) : 0;

        return (
          <button
            key={row.value}
            type="button"
            onClick={() =>
              toggleFilter({ dimension: groupBy, value: row.value })
            }
            aria-pressed={active}
            title={`${label} — ${row.metric} (${percent}%)`}
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
              {label}
            </span>
            <span className="relative flex items-center gap-3 pl-3 shrink-0 tabular-nums">
              <span className="text-xs text-muted-foreground/70">
                {percent}%
              </span>
              <span className="font-medium">{row.metric}</span>
            </span>
          </button>
        );
      })}

      {rows.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2 mt-1"
        >
          {expanded ? "Show less" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
};

export default ShareBarList;
