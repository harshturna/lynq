"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { UiFilter } from "@/lib/dashboard-types";

/**
 * Click-to-filter chips. OR within a dimension, AND across dimensions; the
 * server (lib/query) applies the same rule, so this only holds the chips and
 * tells the dashboard when they change.
 */
type FilterContextValue = {
  filters: UiFilter[];
  toggleFilter: (filter: UiFilter) => void;
  removeFilter: (filter: UiFilter) => void;
  clearFilters: () => void;
  isActive: (filter: UiFilter) => boolean;
};

const FilterContext = createContext<FilterContextValue | null>(null);

const sameFilter = (a: UiFilter, b: UiFilter) =>
  a.dimension === b.dimension && a.value === b.value;

export const FilterProvider = ({ children }: { children: React.ReactNode }) => {
  const [filters, setFilters] = useState<UiFilter[]>([]);

  const toggleFilter = useCallback((filter: UiFilter) => {
    setFilters((current) =>
      current.some((f) => sameFilter(f, filter))
        ? current.filter((f) => !sameFilter(f, filter))
        : [...current, filter]
    );
  }, []);

  const removeFilter = useCallback((filter: UiFilter) => {
    setFilters((current) => current.filter((f) => !sameFilter(f, filter)));
  }, []);

  const clearFilters = useCallback(() => setFilters([]), []);

  const isActive = useCallback(
    (filter: UiFilter) => filters.some((f) => sameFilter(f, filter)),
    [filters]
  );

  const value = useMemo(
    () => ({ filters, toggleFilter, removeFilter, clearFilters, isActive }),
    [filters, toggleFilter, removeFilter, clearFilters, isActive]
  );

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context)
    throw new Error("useFilters must be used within a FilterProvider");
  return context;
};
