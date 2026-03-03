"use client";

import { useEffect, useRef, useState } from "react";
import { PrintButton } from "@/components/ui/print-button";
import { useDateFilter } from "@/lib/date-filter-context";
import { ACTIVITY_BAR_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { SourceBreakdown } from "@/types";

const scopeFilters = [
  { value: 0, label: "All Scopes" },
  { value: 1, label: "Scope 1" },
  { value: 2, label: "Scope 2" },
  { value: 3, label: "Scope 3" },
];

export function ByCategoryTab() {
  const [data, setData] = useState<SourceBreakdown[]>([]);
  const [scopeFilter, setScopeFilter] = useState(0);
  const { buildQuery } = useDateFilter();
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = buildQuery();
    fetch(`/api/dashboard/by-source?${q}`).then((r) => r.json()).then(setData).catch(() => {});
  }, [buildQuery]);

  const filtered = scopeFilter === 0 ? data : data.filter((d) => d.scope === scopeFilter);

  return (
    <div ref={chartRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Total Emissions by Activity</h3>
        <PrintButton chartRef={chartRef} title="Emissions by Activity" />
      </div>

      {/* Scope Filter Pills */}
      <div className="mb-6 flex gap-2">
        {scopeFilters.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setScopeFilter(sf.value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              scopeFilter === sf.value
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={filtered}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="sourceName" tick={{ fontSize: 10, fill: "#6b7280" }} angle={-25} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
            />
            <Bar dataKey="total" radius={[4, 4, 0, 0]}>
              {filtered.map((_entry, i) => (
                <Cell key={i} fill={ACTIVITY_BAR_COLORS[i % ACTIVITY_BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[400px] items-center justify-center text-sm text-gray-400">
          No data for the selected filter.
        </div>
      )}
    </div>
  );
}
