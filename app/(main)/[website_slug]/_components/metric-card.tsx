"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ShareBarList from "./share-bar-list";

type Dimension = {
  label: string;
  groupBy: AnalyticsGroupBy;
};

interface MetricCardProps {
  data: AnalyticsDataWithSessionData[];
  /**
   * One entry renders a plain titled card; multiple render a compact inline
   * segmented toggle. This replaces the old nested-tabs approach
   * (DevicesDataViewer sat two tab levels deep).
   */
  dimensions: Dimension[];
}

const MetricCard = ({ data, dimensions }: MetricCardProps) => {
  const [active, setActive] = useState(dimensions[0]);
  const isSegmented = dimensions.length > 1;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        {isSegmented ? (
          <div className="flex items-center gap-1 rounded-md bg-stone-900/60 p-1 w-max">
            {dimensions.map((dimension) => (
              <button
                key={dimension.groupBy}
                type="button"
                onClick={() => setActive(dimension)}
                className={cn(
                  "px-3 py-1 text-xs rounded-[4px] transition-colors",
                  active.groupBy === dimension.groupBy
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
        <ShareBarList data={data} groupBy={active.groupBy} />
      </CardContent>
    </Card>
  );
};

export default MetricCard;
