"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KpiCard } from "@/components/ui/kpi-card";
import { PrintButton } from "@/components/ui/print-button";
import { useDateFilter } from "@/lib/date-filter-context";
import { SCOPE_CHART_COLORS, ACTIVITY_BAR_COLORS, MONTHS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import {
  Activity, Flame, Zap, Globe, MapPin, Target,
  TrendingDown, TrendingUp, Lightbulb, ArrowRight,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { DashboardStats, ScopeBreakdown, SourceBreakdown, TrendDataPoint } from "@/types";

interface SiteEmissionSummary {
  siteId: string;
  total: number;
  scope1: number;
  scope2: number;
  scope3: number;
  facilities: { facility: string; total: number }[];
}

interface TargetSummary {
  id: string;
  year: number;
  targetEmissions: number;
  actual: number;
  progress: number;
  onTrack: boolean;
  site?: { name: string } | null;
}

export function OverviewTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [byScope, setByScope] = useState<ScopeBreakdown[]>([]);
  const [bySource, setBySource] = useState<SourceBreakdown[]>([]);
  const [trend, setTrend] = useState<TrendDataPoint[]>([]);
  const [sites, setSites] = useState<Record<string, SiteEmissionSummary>>({});
  const [targets, setTargets] = useState<TargetSummary[]>([]);
  const { buildQuery, selectedYear } = useDateFilter();
  const trendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = buildQuery();
    fetch(`/api/dashboard/stats?${q}`).then((r) => r.json()).then(setStats).catch(() => {});
    fetch(`/api/dashboard/by-scope?${q}`).then((r) => r.json()).then(setByScope).catch(() => {});
    fetch(`/api/dashboard/by-source?${q}`).then((r) => r.json()).then(setBySource).catch(() => {});
    fetch(`/api/dashboard/trend?year=${selectedYear}`).then((r) => r.json()).then(setTrend).catch(() => {});
    fetch(`/api/targets?year=${selectedYear}`).then((r) => r.json()).then(setTargets).catch(() => {});
    // Fetch site breakdowns
    Promise.all([
      fetch(`/api/sites/site-klapmuts/emissions?${q}`).then((r) => r.json()),
      fetch(`/api/sites/site-pretoria/emissions?${q}`).then((r) => r.json()),
    ]).then(([klap, pta]) => {
      setSites({ "site-klapmuts": klap, "site-pretoria": pta });
    }).catch(() => {});
  }, [buildQuery, selectedYear]);

  const total = stats?.total ?? 0;

  // Deltas from trend
  function calcDelta(key: "total" | "scope1" | "scope2" | "scope3"): { value: number; label: string } | null {
    if (trend.length < 2) return null;
    const last = trend[trend.length - 1][key];
    const prev = trend[trend.length - 2][key];
    if (prev === 0) return null;
    return { value: ((last - prev) / prev) * 100, label: "vs prev mo" };
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards with sparklines + deltas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          title="Total Emissions"
          value={`${formatNumber(total)} tCO2e`}
          subtitle={`${selectedYear}`}
          icon={<Activity className="h-4 w-4" />}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
          sparklineData={trend.map((t) => t.total)}
          sparklineColor="#059669"
          delta={calcDelta("total")}
        />
        <KpiCard
          title="Scope 1"
          value={`${formatNumber(stats?.scope1 ?? 0)} tCO2e`}
          subtitle="Direct emissions"
          icon={<Flame className="h-4 w-4" />}
          iconColor="text-green-800"
          iconBgColor="bg-green-100"
          sparklineData={trend.map((t) => t.scope1)}
          sparklineColor="#166534"
          delta={calcDelta("scope1")}
        />
        <KpiCard
          title="Scope 2"
          value={`${formatNumber(stats?.scope2 ?? 0)} tCO2e`}
          subtitle="Purchased energy"
          icon={<Zap className="h-4 w-4" />}
          iconColor="text-green-600"
          iconBgColor="bg-green-50"
          sparklineData={trend.map((t) => t.scope2)}
          sparklineColor="#22c55e"
          delta={calcDelta("scope2")}
        />
        <KpiCard
          title="Scope 3"
          value={`${formatNumber(stats?.scope3 ?? 0)} tCO2e`}
          subtitle="Indirect emissions"
          icon={<Globe className="h-4 w-4" />}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-50"
          sparklineData={trend.map((t) => t.scope3)}
          sparklineColor="#86efac"
          delta={calcDelta("scope3")}
        />
      </div>

      {/* Middle row: Monthly trend + Top sources */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Monthly Trend mini chart */}
        <div ref={trendRef} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 pt-4 pb-2 shadow-sm lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Monthly Trend</h3>
            <PrintButton chartRef={trendRef} title="Monthly Trend" />
          </div>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="ovGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SCOPE_CHART_COLORS[1]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={SCOPE_CHART_COLORS[1]} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="ovGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SCOPE_CHART_COLORS[2]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={SCOPE_CHART_COLORS[2]} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="ovGrad3" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SCOPE_CHART_COLORS[3]} stopOpacity={0.3} />
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
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="scope1" stackId="1" stroke={SCOPE_CHART_COLORS[1]} fill="url(#ovGrad1)" strokeWidth={2} name="Scope 1" />
                <Area type="monotone" dataKey="scope2" stackId="1" stroke={SCOPE_CHART_COLORS[2]} fill="url(#ovGrad2)" strokeWidth={2} name="Scope 2" />
                <Area type="monotone" dataKey="scope3" stackId="1" stroke={SCOPE_CHART_COLORS[3]} fill="url(#ovGrad3)" strokeWidth={2} name="Scope 3" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">No trend data.</div>
          )}
        </div>

        {/* Top 5 Sources */}
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 px-5 pt-4 pb-2 shadow-sm lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Top Sources</h3>
          </div>
          {bySource.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bySource.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <YAxis type="category" dataKey="sourceName" tick={{ fontSize: 10, fill: "#4b5563" }} width={110} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                  formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={24}>
                  {bySource.slice(0, 5).map((_e, i) => (
                    <Cell key={i} fill={ACTIVITY_BAR_COLORS[i % ACTIVITY_BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">No source data.</div>
          )}
        </div>
      </div>

      {/* Bottom row: Site comparison + Target progress + Key insights */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Site Comparison */}
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">By Site</h3>
            </div>
            <Link href="/sites" className="text-[10px] font-semibold text-emerald-600 hover:underline flex items-center gap-0.5">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {Object.entries(sites).map(([id, data]) => {
              const siteTotal = data?.total ?? 0;
              const pct = total > 0 ? (siteTotal / total) * 100 : 0;
              const name = id === "site-klapmuts" ? "Klapmuts" : "Pretoria";
              return (
                <div key={id}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{name}</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">{formatNumber(siteTotal)} <span className="text-[10px] font-normal text-gray-400">tCO2e</span></span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                    <div className="h-2 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-400">{pct.toFixed(1)}% of total &middot; {data?.facilities?.length ?? 0} facilities</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Target Progress */}
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Targets</h3>
            </div>
            <Link href="/targets" className="text-[10px] font-semibold text-emerald-600 hover:underline flex items-center gap-0.5">
              Manage <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {targets.length > 0 ? (
            <div className="space-y-3">
              {targets.slice(0, 3).map((t) => (
                <div key={t.id}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {t.year}{t.site ? ` — ${t.site.name}` : ""}
                    </span>
                    <span className={`text-xs font-bold ${t.onTrack ? "text-emerald-600" : "text-red-500"}`}>
                      {t.progress.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                    <div className={`h-2 rounded-full transition-all ${t.onTrack ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${Math.min(t.progress, 100)}%` }} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-gray-400">{formatNumber(t.actual)} / {formatNumber(t.targetEmissions)} tCO2e</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-sm text-gray-400">No targets set</p>
              <Link href="/targets" className="mt-1 text-xs font-medium text-emerald-600 hover:underline">Set a target &rarr;</Link>
            </div>
          )}
        </div>

        {/* Key Insights */}
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Key Insights</h3>
          </div>
          <ul className="space-y-2.5">
            {(() => {
              const items: { text: string; icon: React.ReactNode; color: string }[] = [];

              if (byScope.length > 0 && total > 0) {
                const largest = [...byScope].sort((a, b) => b.total - a.total)[0];
                items.push({
                  text: `${largest.label} dominates at ${largest.percentage.toFixed(0)}% of total emissions`,
                  icon: <Lightbulb className="h-3 w-3" />,
                  color: "text-emerald-700 dark:text-emerald-400",
                });
              }

              if (bySource.length > 0) {
                items.push({
                  text: `${bySource[0].sourceName} is the largest source (${formatNumber(bySource[0].total)} tCO2e)`,
                  icon: <Flame className="h-3 w-3" />,
                  color: "text-gray-700 dark:text-gray-300",
                });
              }

              if (trend.length >= 2) {
                const last = trend[trend.length - 1];
                const prev = trend[trend.length - 2];
                const change = prev.total > 0 ? ((last.total - prev.total) / prev.total) * 100 : 0;
                if (Math.abs(change) > 1) {
                  items.push({
                    text: `Emissions ${change < 0 ? "decreased" : "increased"} ${Math.abs(change).toFixed(0)}% vs previous month`,
                    icon: change < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />,
                    color: change < 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600",
                  });
                }
              }

              if (byScope.length > 0) {
                const smallest = [...byScope].sort((a, b) => a.total - b.total)[0];
                if (smallest.percentage < 5 && smallest.total > 0) {
                  items.push({
                    text: `${smallest.label} is immaterial at ${smallest.percentage.toFixed(1)}%`,
                    icon: <Globe className="h-3 w-3" />,
                    color: "text-gray-500",
                  });
                }
              }

              const siteValues = Object.entries(sites);
              if (siteValues.length === 2) {
                const sorted = siteValues.sort((a, b) => (b[1]?.total ?? 0) - (a[1]?.total ?? 0));
                const topName = sorted[0][0] === "site-klapmuts" ? "Klapmuts" : "Pretoria";
                const topPct = total > 0 ? ((sorted[0][1]?.total ?? 0) / total * 100).toFixed(0) : "0";
                items.push({
                  text: `${topName} accounts for ${topPct}% of all emissions`,
                  icon: <MapPin className="h-3 w-3" />,
                  color: "text-gray-700 dark:text-gray-300",
                });
              }

              return items.map((item, i) => (
                <li key={i} className={`flex items-start gap-2 text-xs font-medium ${item.color}`}>
                  <span className="mt-0.5 shrink-0">{item.icon}</span>
                  {item.text}
                </li>
              ));
            })()}
          </ul>
        </div>
      </div>
    </div>
  );
}
