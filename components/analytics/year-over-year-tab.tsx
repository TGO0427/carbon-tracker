"use client";

import { useEffect, useRef, useState } from "react";
import { PrintButton } from "@/components/ui/print-button";
import { useDateFilter } from "@/lib/date-filter-context";
import { SCOPE_CHART_COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import type { YearlyDataPoint } from "@/types";

interface MonthCompare {
  month: string;
  currentTotal: number;
  previousTotal: number;
  currentScope1: number;
  currentScope2: number;
  currentScope3: number;
  previousScope1: number;
  previousScope2: number;
  previousScope3: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function YearOverYearTab() {
  const [yearlyData, setYearlyData] = useState<YearlyDataPoint[]>([]);
  const [compareData, setCompareData] = useState<MonthCompare[]>([]);
  const { selectedYear, buildQuery } = useDateFilter();
  const yearlyRef = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const previousYear = selectedYear - 1;

  useEffect(() => {
    const q = buildQuery();
    fetch(`/api/dashboard/yearly?${q}`).then((r) => r.json()).then(setYearlyData).catch(() => {});
  }, [buildQuery]);

  // Fetch trend data for current and previous year
  useEffect(() => {
    Promise.all([
      fetch(`/api/dashboard/trend?year=${selectedYear}`).then((r) => r.json()),
      fetch(`/api/dashboard/trend?year=${previousYear}`).then((r) => r.json()),
    ]).then(([current, previous]) => {
      const currentMap: Record<string, { scope1: number; scope2: number; scope3: number; total: number }> = {};
      const previousMap: Record<string, { scope1: number; scope2: number; scope3: number; total: number }> = {};

      for (const d of current) {
        const monthNum = parseInt(d.month.split("-")[1]);
        currentMap[monthNum] = d;
      }
      for (const d of previous) {
        const monthNum = parseInt(d.month.split("-")[1]);
        previousMap[monthNum] = d;
      }

      const data: MonthCompare[] = [];
      for (let m = 1; m <= 12; m++) {
        const cur = currentMap[m] || { scope1: 0, scope2: 0, scope3: 0, total: 0 };
        const prev = previousMap[m] || { scope1: 0, scope2: 0, scope3: 0, total: 0 };
        if (cur.total > 0 || prev.total > 0) {
          data.push({
            month: MONTH_LABELS[m - 1],
            currentTotal: cur.total,
            previousTotal: prev.total,
            currentScope1: cur.scope1, currentScope2: cur.scope2, currentScope3: cur.scope3,
            previousScope1: prev.scope1, previousScope2: prev.scope2, previousScope3: prev.scope3,
          });
        }
      }
      setCompareData(data);
    }).catch(() => {});
  }, [selectedYear, previousYear]);

  // Calculate YoY change
  const currentYearData = yearlyData.find((y) => y.year === selectedYear);
  const previousYearData = yearlyData.find((y) => y.year === previousYear);
  const currentTotal = currentYearData?.total ?? 0;
  const previousTotal = previousYearData?.total ?? 0;
  const changePct = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

  const scopeChanges = [
    { label: "Scope 1", current: currentYearData?.scope1 ?? 0, previous: previousYearData?.scope1 ?? 0, color: SCOPE_CHART_COLORS[1] },
    { label: "Scope 2", current: currentYearData?.scope2 ?? 0, previous: previousYearData?.scope2 ?? 0, color: SCOPE_CHART_COLORS[2] },
    { label: "Scope 3", current: currentYearData?.scope3 ?? 0, previous: previousYearData?.scope3 ?? 0, color: SCOPE_CHART_COLORS[3] },
  ];

  return (
    <div className="space-y-6">
      {/* YoY Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Total change */}
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm md:col-span-1">
          <p className="text-xs font-medium text-gray-400">Year-over-Year Change</p>
          <div className="mt-2 flex items-center gap-2">
            {changePct < 0 ? (
              <TrendingDown className="h-5 w-5 text-emerald-600" />
            ) : changePct > 0 ? (
              <TrendingUp className="h-5 w-5 text-red-500" />
            ) : (
              <Minus className="h-5 w-5 text-gray-400" />
            )}
            <span className={`text-2xl font-bold ${changePct < 0 ? "text-emerald-600" : changePct > 0 ? "text-red-500" : "text-gray-400"}`}>
              {changePct !== 0 ? `${changePct > 0 ? "+" : ""}${changePct.toFixed(1)}%` : "—"}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">{selectedYear} vs {previousYear}</p>
        </div>

        {/* Per-scope change cards */}
        {scopeChanges.map((s) => {
          const pct = s.previous > 0 ? ((s.current - s.previous) / s.previous) * 100 : 0;
          return (
            <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                <p className="text-xs font-medium text-gray-400">{s.label}</p>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-lg font-bold text-gray-900">{formatNumber(s.current)}</span>
                <span className="text-xs text-gray-400">vs {formatNumber(s.previous)}</span>
              </div>
              {s.previous > 0 && (
                <p className={`mt-1 text-xs font-medium ${pct < 0 ? "text-emerald-600" : pct > 0 ? "text-red-500" : "text-gray-400"}`}>
                  {pct > 0 ? "+" : ""}{pct.toFixed(1)}%
                </p>
              )}
            </div>
          );
        })}
      </div>

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
              <Legend />
              <Bar dataKey="scope1" name="Scope 1" fill={SCOPE_CHART_COLORS[1]} stackId="stack" radius={[0, 0, 0, 0]} />
              <Bar dataKey="scope2" name="Scope 2" fill={SCOPE_CHART_COLORS[2]} stackId="stack" />
              <Bar dataKey="scope3" name="Scope 3" fill={SCOPE_CHART_COLORS[3]} stackId="stack" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[350px] items-center justify-center text-sm text-gray-400">No yearly data yet.</div>
        )}
      </div>

      {/* Month-by-Month Comparison */}
      <div ref={compareRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Monthly Comparison</h3>
            <p className="text-sm text-gray-400">{selectedYear} vs {previousYear}</p>
          </div>
          <PrintButton chartRef={compareRef} title={`Monthly Comparison ${selectedYear} vs ${previousYear}`} />
        </div>
        {compareData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={compareData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
              />
              <Legend />
              <Line type="monotone" dataKey="currentTotal" name={`${selectedYear}`} stroke="#166534" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="previousTotal" name={`${previousYear}`} stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[350px] items-center justify-center text-sm text-gray-400">
            No comparison data available. Need data for both {selectedYear} and {previousYear}.
          </div>
        )}
      </div>

      {/* Comparison Table */}
      {compareData.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Month-by-Month Detail</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Month</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">{selectedYear} (tCO2e)</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">{previousYear} (tCO2e)</th>
                  <th className="px-4 py-2 text-right font-medium text-gray-500">Change</th>
                </tr>
              </thead>
              <tbody>
                {compareData.map((row) => {
                  const diff = row.currentTotal - row.previousTotal;
                  const pct = row.previousTotal > 0 ? (diff / row.previousTotal) * 100 : 0;
                  return (
                    <tr key={row.month} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium text-gray-900">{row.month}</td>
                      <td className="px-4 py-2 text-right text-gray-700">{formatNumber(row.currentTotal, 2)}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{formatNumber(row.previousTotal, 2)}</td>
                      <td className={`px-4 py-2 text-right font-medium ${diff < 0 ? "text-emerald-600" : diff > 0 ? "text-red-500" : "text-gray-400"}`}>
                        {row.previousTotal > 0 ? `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
