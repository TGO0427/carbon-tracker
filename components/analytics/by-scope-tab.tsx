"use client";

import { useEffect, useRef, useState } from "react";
import { PrintButton } from "@/components/ui/print-button";
import { useDateFilter } from "@/lib/date-filter-context";
import { SCOPE_CHART_COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { PieLabelRenderProps } from "recharts";
import type { ScopeBreakdown, CategoryBreakdown } from "@/types";

export function ByScopeTab() {
  const [byScope, setByScope] = useState<ScopeBreakdown[]>([]);
  const [byCategory, setByCategory] = useState<CategoryBreakdown[]>([]);
  const { buildQuery } = useDateFilter();
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = buildQuery();
    fetch(`/api/dashboard/by-scope?${q}`).then((r) => r.json()).then(setByScope).catch(() => {});
    fetch(`/api/dashboard/by-category?${q}`).then((r) => r.json()).then(setByCategory).catch(() => {});
  }, [buildQuery]);

  const scopeLabels: Record<number, string> = { 1: "Scope 1 - Direct", 2: "Scope 2 - Energy", 3: "Scope 3 - Indirect" };

  return (
    <div className="space-y-6">
      {/* Large Donut */}
      <div ref={chartRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Total Emissions by Scope</h3>
          <PrintButton chartRef={chartRef} title="Emissions by Scope" />
        </div>
        {byScope.length > 0 && byScope.some((s) => s.total > 0) ? (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={byScope}
                dataKey="total"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={130}
                paddingAngle={3}
                label={(props: PieLabelRenderProps) => {
                  const name = props.name;
                  const pct = ((props.percent ?? 0) * 100).toFixed(0);
                  return `${name} (${pct}%)`;
                }}
                labelLine={{ stroke: "#d1d5db", strokeWidth: 1 }}
              >
                {byScope.map((entry) => (
                  <Cell key={entry.scope} fill={SCOPE_CHART_COLORS[entry.scope]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[350px] items-center justify-center text-sm text-gray-400">No data yet.</div>
        )}
      </div>

      {/* Category Breakdown per Scope */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((scope) => {
          const categories = byCategory.filter((c) => c.scope === scope);
          const scopeTotal = categories.reduce((sum, c) => sum + c.total, 0);
          return (
            <div key={scope} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: SCOPE_CHART_COLORS[scope] }} />
                <h4 className="text-sm font-semibold text-gray-900">{scopeLabels[scope]}</h4>
              </div>
              <p className="mb-3 text-lg font-bold text-gray-900">{formatNumber(scopeTotal)} tCO2e</p>
              {categories.length > 0 ? (
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.category} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-gray-600">{cat.category}</span>
                      <span className="font-medium text-gray-900">{formatNumber(cat.total, 2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No data</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
