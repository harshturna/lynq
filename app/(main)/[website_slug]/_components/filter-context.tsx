"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type FilterContextValue = {
  filters: Filter[];
  toggleFilter: (filter: Filter) => void;
  removeFilter: (filter: Filter) => void;
  clearFilters: () => void;
  isActive: (filter: Filter) => boolean;
};

const FilterContext = createContext<FilterContextValue | null>(null);

const sameFilter = (a: Filter, b: Filter) =>
  a.dimension === b.dimension && a.value === b.value;

export const FilterProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [filters, setFilters] = useState<Filter[]>([]);

  const toggleFilter = useCallback((filter: Filter) => {
    setFilters((current) =>
      current.some((f) => sameFilter(f, filter))
        ? current.filter((f) => !sameFilter(f, filter))
        : [...current, filter]
    );
  }, []);

  const removeFilter = useCallback((filter: Filter) => {
    setFilters((current) => current.filter((f) => !sameFilter(f, filter)));
  }, []);

  const clearFilters = useCallback(() => setFilters([]), []);

  const isActive = useCallback(
    (filter: Filter) => filters.some((f) => sameFilter(f, filter)),
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
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
};
