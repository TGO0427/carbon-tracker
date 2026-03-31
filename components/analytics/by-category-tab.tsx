"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { PrintButton } from "@/components/ui/print-button";
import { useDateFilter } from "@/lib/date-filter-context";
import { SCOPE_CHART_COLORS } from "@/lib/constants";
import { cn, formatNumber } from "@/lib/utils";
import { BarChart as BarChartIcon, Table2, ChevronUp, ChevronDown } from "lucide-react";
import type { SourceBreakdown } from "@/types";

const scopeFilters = [
  { value: 0, label: "All Scopes" },
  { value: 1, label: "Scope 1" },
  { value: 2, label: "Scope 2" },
  { value: 3, label: "Scope 3" },
];

const topNOptions = [
  { value: 5, label: "Top 5" },
  { value: 10, label: "Top 10" },
  { value: 0, label: "All" },
];

type SortKey = "sourceName" | "scope" | "activityTotal" | "total" | "pct";
type SortDir = "asc" | "desc";

export function ByCategoryTab() {
  const [data, setData] = useState<SourceBreakdown[]>([]);
  const [scopeFilter, setScopeFilter] = useState(0);
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [topN, setTopN] = useState(5);
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const { buildQuery } = useDateFilter();
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = buildQuery();
    fetch(`/api/dashboard/by-source?${q}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [buildQuery]);

  // Filter by scope, sort descending by total, apply topN
  const filtered = useMemo(() => {
    const scoped = scopeFilter === 0 ? data : data.filter((d) => d.scope === scopeFilter);
    // Always sort by total desc first, then apply topN
    const sorted = [...scoped].sort((a, b) => b.total - a.total);
    return topN === 0 ? sorted : sorted.slice(0, topN);
  }, [data, scopeFilter, topN]);

  // Grand total for percentage calculation
  const grandTotal = useMemo(() => {
    const scoped = scopeFilter === 0 ? data : data.filter((d) => d.scope === scopeFilter);
    return scoped.reduce((s, d) => s + d.total, 0);
  }, [data, scopeFilter]);

  // Max value for bar scaling
  const maxTotal = useMemo(() => {
    return filtered.length > 0 ? Math.max(...filtered.map((d) => d.total)) : 1;
  }, [filtered]);

  // Table-sorted data
  const tableSorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "sourceName":
          return dir * a.sourceName.localeCompare(b.sourceName);
        case "scope":
          return dir * (a.scope - b.scope);
        case "activityTotal":
          return dir * ((a.activityTotal ?? 0) - (b.activityTotal ?? 0));
        case "total":
          return dir * (a.total - b.total);
        case "pct": {
          const pctA = grandTotal > 0 ? a.total / grandTotal : 0;
          const pctB = grandTotal > 0 ? b.total / grandTotal : 0;
          return dir * (pctA - pctB);
        }
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir, grandTotal]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) {
      return <ChevronDown className="ml-1 inline h-3 w-3 opacity-30" />;
    }
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ChevronDown className="ml-1 inline h-3 w-3" />
    );
  }

  function scopeColor(scope: number): string {
    return SCOPE_CHART_COLORS[scope] ?? "#9ca3af";
  }

  return (
    <div
      ref={chartRef}
      className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm"
    >
      {/* Header Row */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Total Emissions by Activity
        </h3>
        <div className="flex items-center gap-2">
          {/* Chart / Table Toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-0.5">
            <button
              onClick={() => setViewMode("chart")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "chart"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <BarChartIcon className="h-3.5 w-3.5" />
              Chart
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "table"
                  ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <Table2 className="h-3.5 w-3.5" />
              Table
            </button>
          </div>

          {/* Top N Selector */}
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-0.5">
            {topNOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTopN(opt.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  topN === opt.value
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <PrintButton chartRef={chartRef} title="Emissions by Activity" />
        </div>
      </div>

      {/* Scope Filter Pills */}
      <div className="mb-6 flex flex-wrap gap-2">
        {scopeFilters.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setScopeFilter(sf.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              scopeFilter === sf.value
                ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700/20"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <>
          {/* =================== CHART VIEW =================== */}
          {viewMode === "chart" && (
            <div className="space-y-3">
              {filtered.map((item) => {
                const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
                const barWidth = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                const color = scopeColor(item.scope);

                return (
                  <div key={item.sourceName} className="group">
                    {/* Source label row */}
                    <div className="mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {item.sourceName}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${color}18`,
                            color,
                          }}
                        >
                          Scope {item.scope}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {formatNumber(item.total)} tCO2e
                      </span>
                    </div>

                    {/* Bar row */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-7 rounded-md bg-gray-100 dark:bg-gray-700/50 overflow-hidden">
                        <div
                          className="h-full rounded-md transition-all duration-500 ease-out"
                          style={{
                            width: `${Math.max(barWidth, 1)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="w-14 text-right text-xs font-bold text-gray-600 dark:text-gray-300">
                        {pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* =================== TABLE VIEW =================== */}
          {viewMode === "table" && (
            <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    {([
                      ["sourceName", "Source"],
                      ["scope", "Scope"],
                      ["activityTotal", "Activity Total"],
                      ["total", "tCO2e"],
                      ["pct", "% of Total"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className={cn(
                          "cursor-pointer select-none px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors",
                          key !== "sourceName" && "text-right"
                        )}
                      >
                        {label}
                        <SortIcon column={key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {tableSorted.map((item) => {
                    const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
                    const color = scopeColor(item.scope);
                    return (
                      <tr
                        key={item.sourceName}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                          {item.sourceName}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                            style={{
                              backgroundColor: `${color}18`,
                              color,
                            }}
                          >
                            Scope {item.scope}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300 tabular-nums">
                          {item.activityTotal != null
                            ? `${formatNumber(item.activityTotal)} ${item.activityUnit ?? ""}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white tabular-nums">
                          {formatNumber(item.total)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                            <span className="w-12 text-right text-xs font-medium text-gray-600 dark:text-gray-300 tabular-nums">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="flex h-[400px] items-center justify-center text-sm text-gray-400 dark:text-gray-500">
          No data for the selected filter.
        </div>
      )}
    </div>
  );
}
