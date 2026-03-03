"use client";

import { useEffect, useRef, useState } from "react";
import { KpiCard } from "@/components/ui/kpi-card";
import { PrintButton } from "@/components/ui/print-button";
import { useDateFilter } from "@/lib/date-filter-context";
import { SCOPE_CHART_COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { Activity, Flame, Zap, Globe } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { PieLabelRenderProps } from "recharts";
import type { DashboardStats, ScopeBreakdown } from "@/types";

export function OverviewTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [byScope, setByScope] = useState<ScopeBreakdown[]>([]);
  const { buildQuery } = useDateFilter();
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = buildQuery();
    fetch(`/api/dashboard/stats?${q}`).then((r) => r.json()).then(setStats).catch(() => {});
    fetch(`/api/dashboard/by-scope?${q}`).then((r) => r.json()).then(setByScope).catch(() => {});
  }, [buildQuery]);

  const total = stats?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          title="Total Emissions"
          value={`${formatNumber(total)} t`}
          subtitle="tCO2e"
          icon={<Activity className="h-5 w-5" />}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
        />
        <KpiCard
          title="Scope 1"
          value={`${formatNumber(stats?.scope1 ?? 0)} t`}
          subtitle="Direct"
          icon={<Flame className="h-5 w-5" />}
          iconColor="text-green-800"
          iconBgColor="bg-green-100"
        />
        <KpiCard
          title="Scope 2"
          value={`${formatNumber(stats?.scope2 ?? 0)} t`}
          subtitle="Energy"
          icon={<Zap className="h-5 w-5" />}
          iconColor="text-green-600"
          iconBgColor="bg-green-50"
        />
        <KpiCard
          title="Scope 3"
          value={`${formatNumber(stats?.scope3 ?? 0)} t`}
          subtitle="Indirect"
          icon={<Globe className="h-5 w-5" />}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-50"
        />
      </div>

      {/* Donut Chart */}
      <div ref={chartRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Total Emissions by Scope</h3>
          <PrintButton chartRef={chartRef} title="Total Emissions by Scope" />
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
    </div>
  );
}
