"use client";

import { X } from "lucide-react";
import { countryFlag } from "@/lib/geo/country-centroids";
import { useFilters } from "./filter-context";

const DIMENSION_LABEL: Record<AnalyticsGroupBy, string> = {
  pages: "Page",
  countries: "Country",
  devices: "Device",
  browsers: "Browser",
  operating_systems: "OS",
  referrers: "Referrer",
};

const FilterChips = () => {
  const { filters, removeFilter, clearFilters } = useFilters();

  if (!filters.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs text-muted-foreground">Filtered by</span>
      {filters.map((filter) => {
        const flag =
          filter.dimension === "countries" ? countryFlag(filter.value) : "";
        return (
          <button
            key={`${filter.dimension}:${filter.value}`}
            type="button"
            onClick={() => removeFilter(filter)}
            className="group flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs transition-colors hover:bg-cyan-500/20"
          >
            <span className="text-muted-foreground">
              {DIMENSION_LABEL[filter.dimension]}
            </span>
            <span className="font-medium">
              {flag ? `${flag} ${filter.value}` : filter.value}
            </span>
            <X className="h-3 w-3 text-muted-foreground group-hover:text-foreground" />
          </button>
        );
      })}
      <button
        type="button"
        onClick={clearFilters}
        className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
      >
        Clear all
      </button>
    </div>
  );
};

export default FilterChips;
