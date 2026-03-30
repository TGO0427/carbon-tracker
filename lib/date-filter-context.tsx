"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface DateFilterState {
  selectedYear: number;
  selectedMonth: number | null;
  selectedSiteId: string | null;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number | null) => void;
  setSelectedSiteId: (siteId: string | null) => void;
  buildQuery: (extra?: Record<string, string>) => string;
}

const DateFilterContext = createContext<DateFilterState | null>(null);

export function DateFilterProvider({ children }: { children: ReactNode }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  function buildQuery(extra?: Record<string, string>) {
    const params = new URLSearchParams();
    params.set("year", String(selectedYear));
    if (selectedMonth) params.set("month", String(selectedMonth));
    if (selectedSiteId) params.set("siteId", selectedSiteId);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params.toString();
  }

  return (
    <DateFilterContext.Provider value={{ selectedYear, selectedMonth, selectedSiteId, setSelectedYear, setSelectedMonth, setSelectedSiteId, buildQuery }}>
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const ctx = useContext(DateFilterContext);
  if (!ctx) throw new Error("useDateFilter must be used within DateFilterProvider");
  return ctx;
}
