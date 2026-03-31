"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import {
  Flame, Zap, Globe, Activity, Truck, Droplets,
  Plus, Eye, AlertTriangle, TrendingDown, TrendingUp, Lightbulb,
} from "lucide-react";
import type { DashboardStats, ScopeBreakdown, SourceBreakdown, TrendDataPoint } from "@/types";
import {
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { SCOPE_CHART_COLORS, ACTIVITY_BAR_COLORS, MONTHS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { PrintButton } from "@/components/ui/print-button";
import { useDateFilter } from "@/lib/date-filter-context";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [byScope, setByScope] = useState<ScopeBreakdown[]>([]);
  const [bySource, setBySource] = useState<SourceBreakdown[]>([]);
  const [trend, setTrend] = useState<TrendDataPoint[]>([]);
  const [missingData, setMissingData] = useState<{ missingCount: number; missing: { facility: string; sourceName: string; month: string }[] } | null>(null);
  const [validationAlerts, setValidationAlerts] = useState<{ alertCount: number; alerts: { severity: string; message: string; facility: string; month: string }[] } | null>(null);
  const { buildQuery, selectedYear, selectedMonth } = useDateFilter();

  const trendRef = useRef<HTMLDivElement>(null);
  const donutRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = buildQuery();
    fetch(`/api/dashboard/stats?${q}`).then((r) => r.json()).then(setStats).catch(() => {});
    fetch(`/api/dashboard/by-scope?${q}`).then((r) => r.json()).then(setByScope).catch(() => {});
    fetch(`/api/dashboard/by-source?${q}`).then((r) => r.json()).then(setBySource).catch(() => {});
    fetch(`/api/dashboard/trend?${q}`).then((r) => r.json()).then(setTrend).catch(() => {});
    fetch(`/api/dashboard/missing-data?year=${selectedYear}`).then((r) => r.json()).then(setMissingData).catch(() => {});
    fetch(`/api/dashboard/validation?year=${selectedYear}`).then((r) => r.json()).then(setValidationAlerts).catch(() => {});
  }, [buildQuery, selectedYear]);

  const total = stats?.total ?? 0;
  const isMonthView = selectedMonth !== null;
  const monthLabel = selectedMonth ? MONTHS.find((m) => m.value === selectedMonth)?.label ?? "" : "";

  // Chart title adapts to selection
  const trendTitle = isMonthView ? "Emissions by Scope" : "Monthly Trend";
  const trendSubtitle = isMonthView ? `${monthLabel} ${selectedYear}` : `${selectedYear}`;

  // Intensity: per-month average
  const monthsWithData = trend.length || 1;
  const intensity = total / monthsWithData;

  // MoM delta calculations for KPI cards
  function calcDelta(key: "total" | "scope1" | "scope2" | "scope3"): { value: number; label: string } | null {
    if (trend.length < 2) return null;
    const last = trend[trend.length - 1][key];
    const prev = trend[trend.length - 2][key];
    if (prev === 0) return null;
    return { value: ((last - prev) / prev) * 100, label: "vs prev mo" };
  }

  // Smart insights
  const insights: { icon: React.ReactNode; text: string; color: string }[] = [];
  if (total > 0 && byScope.length > 0) {
    const largest = [...byScope].sort((a, b) => b.total - a.total)[0];
    insights.push({
      icon: <Lightbulb className="h-3.5 w-3.5" />,
      text: `${largest.label} is the largest contributor at ${largest.percentage.toFixed(0)}%`,
      color: "text-emerald-700",
    });
  }
  if (trend.length >= 2) {
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    const change = prev.total > 0 ? ((last.total - prev.total) / prev.total) * 100 : 0;
    if (Math.abs(change) > 1) {
      insights.push({
        icon: change < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />,
        text: `${change < 0 ? "Down" : "Up"} ${Math.abs(change).toFixed(0)}% vs previous month`,
        color: change < 0 ? "text-emerald-700" : "text-amber-700",
      });
    }
  }
  if (intensity > 0 && !isMonthView) {
    insights.push({
      icon: <Activity className="h-3.5 w-3.5" />,
      text: `Averaging ${formatNumber(intensity)} tCO2e/month across ${monthsWithData} months`,
      color: "text-gray-600",
    });
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Welcome back, Admin</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emissions Overview</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/emissions/new">
            <Button><Plus className="h-4 w-4" /> Add Emission</Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline"><Eye className="h-4 w-4" /> View Reports</Button>
          </Link>
        </div>
      </div>

      {/* KPI Row: 5 cards, hero slightly wider */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {/* Hero: Total Emissions */}
        <Link
          href="/analytics"
          className="col-span-2 lg:col-span-1 group flex flex-col justify-between rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-950 dark:via-gray-800 dark:to-gray-800 dark:border-emerald-800 p-4 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900 p-2">
              <Activity className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <svg width={56} height={22} className="opacity-50">
              {trend.length >= 2 && (() => {
                const data = trend.map((t) => t.total);
                const max = Math.max(...data); const min = Math.min(...data);
                const range = max - min || 1; const step = 56 / (data.length - 1);
                const points = data.map((v, i) => `${i * step},${22 - ((v - min) / range) * 22}`).join(" ");
                return <polyline points={points} fill="none" stroke="#059669" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />;
              })()}
            </svg>
          </div>
          <div className="mt-2">
            <p className="text-xl font-extrabold text-gray-900 dark:text-white">{formatNumber(total)}</p>
            <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">tCO2e total</p>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total Emissions</p>
            {calcDelta("total") && calcDelta("total")!.value !== 0 && (
              <span className={`text-[10px] font-semibold ${calcDelta("total")!.value < 0 ? "text-emerald-600" : "text-red-500"}`}>
                {calcDelta("total")!.value > 0 ? "+" : ""}{calcDelta("total")!.value.toFixed(1)}%
              </span>
            )}
          </div>
        </Link>

        {/* Scope 1 */}
        <KpiCard
          title="Scope 1"
          value={`${formatNumber(stats?.scope1 ?? 0)} tCO2e`}
          subtitle="Direct emissions"
          icon={<Flame className="h-4 w-4" />}
          iconColor="text-green-800"
          iconBgColor="bg-green-100"
          href="/emissions?scope=1"
          sparklineData={trend.map((t) => t.scope1)}
          sparklineColor="#166534"
          delta={calcDelta("scope1")}
        />
        {/* Scope 2 */}
        <KpiCard
          title="Scope 2"
          value={`${formatNumber(stats?.scope2 ?? 0)} tCO2e`}
          subtitle="Purchased energy"
          icon={<Zap className="h-4 w-4" />}
          iconColor="text-green-600"
          iconBgColor="bg-green-50"
          href="/emissions?scope=2"
          sparklineData={trend.map((t) => t.scope2)}
          sparklineColor="#22c55e"
          delta={calcDelta("scope2")}
        />
        {/* Scope 3 */}
        <KpiCard
          title="Scope 3"
          value={`${formatNumber(stats?.scope3 ?? 0)} tCO2e`}
          subtitle="Indirect emissions"
          icon={<Globe className="h-4 w-4" />}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-50"
          href="/emissions?scope=3"
          sparklineData={trend.map((t) => t.scope3)}
          sparklineColor="#86efac"
          delta={calcDelta("scope3")}
        />
        {/* Intensity — proper rate metric */}
        <KpiCard
          title="Monthly Avg"
          value={`${formatNumber(intensity)} tCO2e`}
          subtitle={isMonthView ? `${monthLabel} only` : `÷ ${monthsWithData} months`}
          icon={<Droplets className="h-4 w-4" />}
          iconColor="text-teal-600"
          iconBgColor="bg-teal-50"
          href="/analytics"
        />
      </div>

      {/* Insight Strip */}
      {insights.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-2.5">
          {insights.map((ins, i) => (
            <div key={i} className={`flex items-center gap-1.5 text-xs font-medium ${ins.color}`}>
              {ins.icon}
              {ins.text}
            </div>
          ))}
        </div>
      )}

      {/* Compact Alert Banners */}
      {missingData && missingData.missingCount > 0 && (
        <Link href="/imports" className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 hover:bg-amber-100/80 transition-colors">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-xs font-semibold text-amber-800">
            {missingData.missingCount} missing data points
          </span>
          <div className="flex flex-wrap gap-1.5">
            {missingData.missing.slice(0, 5).map((m, i) => (
              <span key={i} className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                {m.facility} &middot; {m.month.split("-")[1]}
              </span>
            ))}
            {missingData.missingCount > 5 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                +{missingData.missingCount - 5}
              </span>
            )}
          </div>
          <span className="ml-auto text-[10px] font-semibold text-amber-700 shrink-0">Import &rarr;</span>
        </Link>
      )}

      {validationAlerts && validationAlerts.alertCount > 0 && (
        <div className="flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-xs font-semibold text-red-800">
            {validationAlerts.alertCount} {validationAlerts.alertCount === 1 ? "outlier" : "outliers"} detected
          </span>
          <div className="flex flex-wrap gap-1.5">
            {validationAlerts.alerts.slice(0, 4).map((a, i) => (
              <span key={i} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                a.severity === "critical" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
              }`}>
                {a.facility} &middot; {a.month.split("-")[1]}
              </span>
            ))}
            {validationAlerts.alertCount > 4 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                +{validationAlerts.alertCount - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Charts Row 1: Trend/Scope + Donut */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Monthly Trend OR Scope Breakdown (adapts to selection) */}
        <div ref={trendRef} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 pt-4 pb-2 shadow-sm lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{trendTitle}</h3>
              <span className="text-xs text-gray-400">{trendSubtitle}</span>
            </div>
            <PrintButton chartRef={trendRef} title={trendTitle} getData={() => ({
              summary: `${trendTitle}. Total: ${formatNumber(total)} tCO2e.`,
              headers: ["Month", "Scope 1 (tCO2e)", "Scope 2 (tCO2e)", "Scope 3 (tCO2e)", "Total (tCO2e)"],
              rows: trend.map((t) => [t.month, t.scope1.toFixed(2), t.scope2.toFixed(2), t.scope3.toFixed(2), t.total.toFixed(2)]),
            })} />
          </div>
          {trend.length > 1 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradScope1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SCOPE_CHART_COLORS[1]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={SCOPE_CHART_COLORS[1]} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradScope2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SCOPE_CHART_COLORS[2]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={SCOPE_CHART_COLORS[2]} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradScope3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SCOPE_CHART_COLORS[3]} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={SCOPE_CHART_COLORS[3]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={(v: string) => {
                  const m = parseInt(v.split("-")[1]);
                  return MONTHS[m - 1]?.label ?? v;
                }} />
                <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)", fontSize: 12 }}
                  formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
                  labelFormatter={(label) => {
                    const s = String(label);
                    const m = parseInt(s.split("-")[1]);
                    return `${MONTHS[m - 1]?.label ?? s} ${s.split("-")[0]}`;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="scope1" stackId="1" stroke={SCOPE_CHART_COLORS[1]} fill="url(#gradScope1)" strokeWidth={2} name="Scope 1" />
                <Area type="monotone" dataKey="scope2" stackId="1" stroke={SCOPE_CHART_COLORS[2]} fill="url(#gradScope2)" strokeWidth={2} name="Scope 2" />
                <Area type="monotone" dataKey="scope3" stackId="1" stroke={SCOPE_CHART_COLORS[3]} fill="url(#gradScope3)" strokeWidth={2} name="Scope 3" />
              </AreaChart>
            </ResponsiveContainer>
          ) : trend.length === 1 ? (
            /* Single month: horizontal stacked bar */
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  { name: "Scope 1", value: trend[0].scope1, fill: SCOPE_CHART_COLORS[1] },
                  { name: "Scope 2", value: trend[0].scope2, fill: SCOPE_CHART_COLORS[2] },
                  { name: "Scope 3", value: trend[0].scope3, fill: SCOPE_CHART_COLORS[3] },
                ]}
                layout="vertical"
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} width={60} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {[SCOPE_CHART_COLORS[1], SCOPE_CHART_COLORS[2], SCOPE_CHART_COLORS[3]].map((color, i) => (
                    <Cell key={i} fill={color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
              No data yet. Add emissions to see breakdown.
            </div>
          )}
        </div>

        {/* Scope Distribution - Donut */}
        <div ref={donutRef} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 pt-4 pb-2 shadow-sm lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Scope Distribution</h3>
            <PrintButton chartRef={donutRef} title="Scope Distribution" getData={() => ({
              summary: `Scope distribution. Total: ${formatNumber(total)} tCO2e.`,
              headers: ["Scope", "Emissions (tCO2e)", "Percentage"],
              rows: byScope.map((s) => [s.label, s.total.toFixed(2), `${s.percentage.toFixed(1)}%`]),
            })} />
          </div>
          {byScope.length > 0 && byScope.some((s) => s.total > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={byScope}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={85}
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
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">No data yet.</div>
          )}
        </div>
      </div>

      {/* Charts Row 2: By Source + Scope Breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top 5 Sources — horizontal bars */}
        <div ref={sourceRef} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 pt-4 pb-2 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top Sources</h3>
              <span className="text-[11px] text-gray-400">by tCO2e</span>
            </div>
            <PrintButton chartRef={sourceRef} title="Top Emission Sources" getData={() => ({
              summary: `Top emission sources ranked by total tCO2e.`,
              headers: ["Source", "Scope", "Emissions (tCO2e)"],
              rows: bySource.slice(0, 5).map((s) => [s.sourceName, `Scope ${s.scope}`, s.total.toFixed(2)]),
            })} />
          </div>
          {bySource.length > 0 ? (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={bySource.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis type="category" dataKey="sourceName" tick={{ fontSize: 11, fill: "#4b5563" }} width={130} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={28}>
                  {bySource.slice(0, 5).map((_entry, i) => (
                    <Cell key={i} fill={ACTIVITY_BAR_COLORS[i % ACTIVITY_BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[290px] items-center justify-center text-sm text-gray-400">No emission sources yet.</div>
          )}
        </div>

        {/* Scope Summary — interpretive module (not a chart) */}
        <div ref={breakdownRef} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 pt-4 pb-5 shadow-sm flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Scope Summary</h3>
            <PrintButton chartRef={breakdownRef} title="Scope Summary" getData={() => ({
              summary: `Scope summary. Total: ${formatNumber(total)} tCO2e.`,
              headers: ["Scope", "Description", "Emissions (tCO2e)", "Percentage"],
              rows: [
                ["Scope 1", "Fleet fuel, LPG", (stats?.scope1 ?? 0).toFixed(2), total > 0 ? `${(((stats?.scope1 ?? 0) / total) * 100).toFixed(1)}%` : "0%"],
                ["Scope 2", "Purchased electricity", (stats?.scope2 ?? 0).toFixed(2), total > 0 ? `${(((stats?.scope2 ?? 0) / total) * 100).toFixed(1)}%` : "0%"],
                ["Scope 3", "Waste, water, logistics", (stats?.scope3 ?? 0).toFixed(2), total > 0 ? `${(((stats?.scope3 ?? 0) / total) * 100).toFixed(1)}%` : "0%"],
              ],
            })} />
          </div>

          {/* Single stacked bar */}
          {total > 0 && (
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {[
                { value: stats?.scope1 ?? 0, color: "#166534" },
                { value: stats?.scope2 ?? 0, color: "#22c55e" },
                { value: stats?.scope3 ?? 0, color: "#86efac" },
              ].map((s, i) => (
                <div
                  key={i}
                  className="h-full transition-all"
                  style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
                />
              ))}
            </div>
          )}

          {/* Three stat columns */}
          <div className="mt-5 grid grid-cols-3 gap-4 flex-1">
            {[
              { scope: 1, label: "Scope 1", value: stats?.scope1 ?? 0, color: "#166534", icon: <Flame className="h-4 w-4" />, desc: "Direct" },
              { scope: 2, label: "Scope 2", value: stats?.scope2 ?? 0, color: "#22c55e", icon: <Zap className="h-4 w-4" />, desc: "Energy" },
              { scope: 3, label: "Scope 3", value: stats?.scope3 ?? 0, color: "#86efac", icon: <Globe className="h-4 w-4" />, desc: "Indirect" },
            ].map((item) => (
              <div key={item.scope} className="text-center">
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}18` }}>
                  <div style={{ color: item.color }}>{item.icon}</div>
                </div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(item.value)}</p>
                <p className="text-[11px] font-medium text-gray-500">{total > 0 ? `${((item.value / total) * 100).toFixed(0)}%` : "0%"}</p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{item.label}</p>
                <p className="text-[10px] text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Key insight at bottom */}
          {total > 0 && byScope.length > 0 && (
            <div className="mt-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2.5 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {(() => {
                  const largest = [...byScope].sort((a, b) => b.total - a.total)[0];
                  const smallest = [...byScope].sort((a, b) => a.total - b.total)[0];
                  return (
                    <>
                      <span className="font-semibold">{largest.label}</span> dominates at {largest.percentage.toFixed(0)}% —
                      {largest.label === "Scope 2" ? " electricity reduction " : largest.label === "Scope 1" ? " fuel efficiency " : " supply chain optimization "}
                      offers the highest impact.
                      {smallest.total > 0 && <> <span className="font-semibold">{smallest.label}</span> is only {smallest.percentage.toFixed(0)}%.</>}
                    </>
                  );
                })()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
