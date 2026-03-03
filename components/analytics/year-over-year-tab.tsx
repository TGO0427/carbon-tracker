"use client";

import { useEffect, useRef, useState } from "react";
import { PrintButton } from "@/components/ui/print-button";
import { useDateFilter } from "@/lib/date-filter-context";
import { SCOPE_CHART_COLORS } from "@/lib/constants";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { YearlyDataPoint, TrendDataPoint } from "@/types";

export function YearOverYearTab() {
  const [yearlyData, setYearlyData] = useState<YearlyDataPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<TrendDataPoint[]>([]);
  const { buildQuery } = useDateFilter();
  const yearlyRef = useRef<HTMLDivElement>(null);
  const monthlyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/dashboard/yearly").then((r) => r.json()).then(setYearlyData).catch(() => {});
  }, []);

  useEffect(() => {
    const q = buildQuery();
    fetch(`/api/dashboard/trend?${q}`).then((r) => r.json()).then(setMonthlyData).catch(() => {});
  }, [buildQuery]);

  return (
    <div className="space-y-6">
      {/* Yearly Bar Chart */}
      <div ref={yearlyRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Emissions per Year</h3>
          <PrintButton chartRef={yearlyRef} title="Emissions per Year" />
        </div>
        {yearlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={yearlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
              />
              <Bar dataKey="total" fill="#166534" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[350px] items-center justify-center text-sm text-gray-400">No yearly data yet.</div>
        )}
      </div>

      {/* Monthly Bar Chart for Selected Year */}
      <div ref={monthlyRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Monthly Breakdown</h3>
          <PrintButton chartRef={monthlyRef} title="Monthly Breakdown" />
        </div>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
              />
              <Legend />
              <Bar dataKey="scope1" name="Scope 1" fill={SCOPE_CHART_COLORS[1]} radius={[4, 4, 0, 0]} stackId="stack" />
              <Bar dataKey="scope2" name="Scope 2" fill={SCOPE_CHART_COLORS[2]} stackId="stack" />
              <Bar dataKey="scope3" name="Scope 3" fill={SCOPE_CHART_COLORS[3]} radius={[4, 4, 0, 0]} stackId="stack" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[350px] items-center justify-center text-sm text-gray-400">No monthly data for this period.</div>
        )}
      </div>
    </div>
  );
}
