"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { BreakdownKey, Row } from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";
import ShareBarList from "./share-bar-list";

type Dimension = {
  label: string;
  key: BreakdownKey;
  rows: Row[];
};

interface MetricCardProps {
  /**
   * One entry renders a plain titled card; multiple render a compact inline
   * segmented toggle. Rows arrive already ranked from lib/query.
   */
  dimensions: Dimension[];
}

const MetricCard = ({ dimensions }: MetricCardProps) => {
  const [activeKey, setActiveKey] = useState(dimensions[0].key);
  const active = dimensions.find((d) => d.key === activeKey) ?? dimensions[0];
  const isSegmented = dimensions.length > 1;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        {isSegmented ? (
          <div className="flex items-center gap-1 rounded-md bg-stone-900/60 p-1 w-max">
            {dimensions.map((dimension) => (
              <button
                key={dimension.key}
                type="button"
                onClick={() => setActiveKey(dimension.key)}
                className={cn(
                  "px-3 py-1 text-xs rounded-[4px] transition-colors",
                  active.key === dimension.key
                    ? "bg-stone-800 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {dimension.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-sm font-medium">{active.label}</span>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-3 flex-1">
        <ShareBarList rows={active.rows} groupBy={active.key} />
      </CardContent>
    </Card>
  );
};

export default MetricCard;
