"use client";

import { useEffect, useRef, useState } from "react";
import { PrintButton } from "@/components/ui/print-button";
import { useDateFilter } from "@/lib/date-filter-context";
import { ACTIVITY_BAR_COLORS, SCOPE_CHART_COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { Award, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SupplierEmissions } from "@/types";

interface Benchmark {
  label: string;
  scope1PerTonne: number;
  scope2PerTonne: number;
  scope3PerTonne: number;
  totalPerTonne: number;
  electricityKwhPerTonne: number;
  waterM3PerTonne: number;
}

interface BenchmarkData {
  yourMetrics: {
    scope1PerTonne: number;
    scope2PerTonne: number;
    scope3PerTonne: number;
    totalPerTonne: number;
    electricityKwhPerTonne: number;
    waterM3PerTonne: number;
    estimatedProduction: number;
  };
  benchmarks: { foodManufacturing: Benchmark; bestInClass: Benchmark; sectorAverage: Benchmark };
  comparison: { vsSAAverage: { label: string; totalDiff: number; rating: string } };
}

const RATING_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  excellent: { label: "Excellent", color: "text-emerald-700", bg: "bg-emerald-100" },
  good: { label: "Good", color: "text-green-700", bg: "bg-green-100" },
  average: { label: "Average", color: "text-yellow-700", bg: "bg-yellow-100" },
  below_average: { label: "Below Average", color: "text-red-700", bg: "bg-red-100" },
};

export function SectorComparisonTab() {
  const [supplierData, setSupplierData] = useState<SupplierEmissions[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData | null>(null);
  const { buildQuery } = useDateFilter();
  const chartRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = buildQuery();
    fetch(`/api/dashboard/supplier-emissions?${q}`).then((r) => r.json()).then(setSupplierData).catch(() => {});
    fetch(`/api/dashboard/benchmarks?${q}`).then((r) => r.json()).then(setBenchmarkData).catch(() => {});
  }, [buildQuery]);

  const rating = benchmarkData ? RATING_LABELS[benchmarkData.comparison.vsSAAverage.rating] ?? RATING_LABELS.average : null;

  // Build comparison chart data
  const comparisonChartData = benchmarkData ? [
    { name: "Your Company", ...benchmarkData.yourMetrics },
    { name: benchmarkData.benchmarks.foodManufacturing.label, ...benchmarkData.benchmarks.foodManufacturing },
    { name: benchmarkData.benchmarks.bestInClass.label, ...benchmarkData.benchmarks.bestInClass },
    { name: benchmarkData.benchmarks.sectorAverage.label, ...benchmarkData.benchmarks.sectorAverage },
  ].map((d) => ({ name: d.name, "Scope 1": d.scope1PerTonne, "Scope 2": d.scope2PerTonne, "Scope 3": d.scope3PerTonne })) : [];

  return (
    <div className="space-y-6">
      {/* Benchmark Summary */}
      {benchmarkData && rating && (
        <div ref={benchRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Industry Benchmark</h3>
              <p className="text-sm text-gray-400">tCO2e per tonne of product vs SA food manufacturing sector</p>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${rating.color} ${rating.bg}`}>
                {rating.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
            {[
              { label: "Your Total", value: benchmarkData.yourMetrics.totalPerTonne, benchmark: benchmarkData.benchmarks.foodManufacturing.totalPerTonne, unit: "tCO2e/t" },
              { label: "Electricity", value: benchmarkData.yourMetrics.electricityKwhPerTonne, benchmark: benchmarkData.benchmarks.foodManufacturing.electricityKwhPerTonne, unit: "kWh/t" },
              { label: "Water", value: benchmarkData.yourMetrics.waterM3PerTonne, benchmark: benchmarkData.benchmarks.foodManufacturing.waterM3PerTonne, unit: "m³/t" },
              { label: "vs SA Average", value: benchmarkData.comparison.vsSAAverage.totalDiff, benchmark: 0, unit: "%", isPercent: true },
            ].map((m) => {
              const better = "isPercent" in m ? m.value < 0 : m.value < m.benchmark;
              return (
                <div key={m.label} className="rounded-lg bg-gray-50 p-4">
                  <p className="text-xs text-gray-400">{m.label}</p>
                  <div className="mt-1 flex items-center gap-1">
                    {"isPercent" in m ? (
                      m.value < 0 ? <TrendingDown className="h-4 w-4 text-emerald-600" /> :
                      m.value > 0 ? <TrendingUp className="h-4 w-4 text-red-500" /> :
                      <Minus className="h-4 w-4 text-gray-400" />
                    ) : null}
                    <span className={`text-lg font-bold ${"isPercent" in m ? (better ? "text-emerald-600" : "text-red-500") : "text-gray-900"}`}>
                      {"isPercent" in m ? `${m.value > 0 ? "+" : ""}${m.value.toFixed(1)}%` : formatNumber(m.value, 2)}
                    </span>
                  </div>
                  {!("isPercent" in m) && (
                    <p className="text-xs text-gray-400 mt-1">Benchmark: {formatNumber(m.benchmark, 2)} {m.unit}</p>
                  )}
                </div>
              );
            })}
          </div>

          {comparisonChartData.length > 0 && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} label={{ value: "tCO2e/tonne", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "#9ca3af" } }} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(3)} tCO2e/t`} />
                <Legend />
                <Bar dataKey="Scope 1" stackId="a" fill={SCOPE_CHART_COLORS[1]} />
                <Bar dataKey="Scope 2" stackId="a" fill={SCOPE_CHART_COLORS[2]} />
                <Bar dataKey="Scope 3" stackId="a" fill={SCOPE_CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Supplier Emissions */}
      <div ref={chartRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Supplier Emissions</h3>
            <p className="text-sm text-gray-400">Total logistics emissions per supplier/buyer</p>
          </div>
          <PrintButton chartRef={chartRef} title="Supplier Emissions" />
        </div>
        {supplierData.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(300, supplierData.length * 50)}>
            <BarChart data={supplierData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12, fill: "#9ca3af" }} />
              <YAxis dataKey="supplierName" type="category" width={160} tick={{ fontSize: 12, fill: "#6b7280" }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
              />
              <Bar dataKey="totalEmissions" radius={[0, 4, 4, 0]}>
                {supplierData.map((_entry, i) => (
                  <Cell key={i} fill={ACTIVITY_BAR_COLORS[i % ACTIVITY_BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
            No supplier emission data available.
          </div>
        )}
      </div>
    </div>
  );
}
