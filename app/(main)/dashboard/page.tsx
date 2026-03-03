"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KpiCard } from "@/components/ui/kpi-card";
import { Button } from "@/components/ui/button";
import {
  Flame, Zap, Globe, Activity, Truck, Droplets,
  Plus, Eye, Printer,
} from "lucide-react";
import type { DashboardStats, ScopeBreakdown, SourceBreakdown, TrendDataPoint } from "@/types";
import {
  PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { SCOPE_CHART_COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const SOURCE_BAR_COLORS = ["#166534", "#15803d", "#16a34a", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7"];

async function printChartToPdf(element: HTMLElement | null, title: string) {
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#ffffff" });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height / canvas.width) * imgWidth;
  pdf.setFontSize(16);
  pdf.text(title, 10, 15);
  pdf.setFontSize(9);
  pdf.setTextColor(150);
  pdf.text(`Generated ${new Date().toLocaleDateString()}`, 10, 21);
  const yOffset = 28;
  const finalHeight = Math.min(imgHeight, pageHeight - yOffset - 10);
  pdf.addImage(imgData, "PNG", 10, yOffset, imgWidth, finalHeight);
  pdf.save(`${title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

function PrintButton({ chartRef, title }: { chartRef: React.RefObject<HTMLElement | null>; title: string }) {
  return (
    <button
      onClick={() => printChartToPdf(chartRef.current, title)}
      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors print:hidden"
      title={`Export ${title} to PDF`}
    >
      <Printer className="h-4 w-4" />
    </button>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [byScope, setByScope] = useState<ScopeBreakdown[]>([]);
  const [bySource, setBySource] = useState<SourceBreakdown[]>([]);
  const [trend, setTrend] = useState<TrendDataPoint[]>([]);

  const trendRef = useRef<HTMLDivElement>(null);
  const donutRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const breakdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/dashboard/stats").then((r) => r.json()).then(setStats).catch(() => {});
    fetch("/api/dashboard/by-scope").then((r) => r.json()).then(setByScope).catch(() => {});
    fetch("/api/dashboard/by-source").then((r) => r.json()).then(setBySource).catch(() => {});
    fetch("/api/dashboard/trend").then((r) => r.json()).then(setTrend).catch(() => {});
  }, []);

  const total = stats?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Welcome back, Admin</p>
          <h1 className="text-2xl font-bold text-gray-900">Emissions Overview</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/emissions/new">
            <Button>
              <Plus className="h-4 w-4" /> Add Emission
            </Button>
          </Link>
          <Link href="/reports">
            <Button variant="outline">
              <Eye className="h-4 w-4" /> View Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title="Total Emissions"
          value={`${formatNumber(total)} t`}
          subtitle="tCO2e this period"
          icon={<Activity className="h-5 w-5" />}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
        />
        <KpiCard
          title="Scope 1"
          value={`${formatNumber(stats?.scope1 ?? 0)} t`}
          subtitle="Direct emissions"
          icon={<Flame className="h-5 w-5" />}
          iconColor="text-green-800"
          iconBgColor="bg-green-100"
        />
        <KpiCard
          title="Scope 2"
          value={`${formatNumber(stats?.scope2 ?? 0)} t`}
          subtitle="Purchased energy"
          icon={<Zap className="h-5 w-5" />}
          iconColor="text-green-600"
          iconBgColor="bg-green-50"
        />
        <KpiCard
          title="Scope 3"
          value={`${formatNumber(stats?.scope3 ?? 0)} t`}
          subtitle="Indirect emissions"
          icon={<Globe className="h-5 w-5" />}
          iconColor="text-emerald-500"
          iconBgColor="bg-emerald-50"
        />
        <KpiCard
          title="Logistics"
          value={`${stats?.entryCount ?? 0}`}
          subtitle="Total entries"
          icon={<Truck className="h-5 w-5" />}
          iconColor="text-green-700"
          iconBgColor="bg-green-50"
        />
        <KpiCard
          title="Intensity"
          value={total > 0 ? `${formatNumber(total / 12)}/mo` : "0.00/mo"}
          subtitle="Avg monthly"
          icon={<Droplets className="h-5 w-5" />}
          iconColor="text-teal-600"
          iconBgColor="bg-teal-50"
        />
      </div>

      {/* Charts Row 1: Trend + Scope Donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Monthly Trend - wider */}
        <div ref={trendRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="text-base font-semibold text-gray-900">Monthly Trend</h3>
              <span className="text-sm text-gray-400">Emissions by scope</span>
            </div>
            <PrintButton chartRef={trendRef} title="Monthly Trend" />
          </div>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
                />
                <Legend />
                <Line type="monotone" dataKey="scope1" stroke={SCOPE_CHART_COLORS[1]} strokeWidth={2} dot={{ r: 4 }} name="Scope 1" />
                <Line type="monotone" dataKey="scope2" stroke={SCOPE_CHART_COLORS[2]} strokeWidth={2} dot={{ r: 4 }} name="Scope 2" />
                <Line type="monotone" dataKey="scope3" stroke={SCOPE_CHART_COLORS[3]} strokeWidth={2} dot={{ r: 4 }} name="Scope 3" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
              No trend data yet. Add emissions to see monthly breakdown.
            </div>
          )}
        </div>

        {/* Scope Distribution - Donut */}
        <div ref={donutRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="text-base font-semibold text-gray-900">Scope Distribution</h3>
              <span className="text-sm text-gray-400">By scope</span>
            </div>
            <PrintButton chartRef={donutRef} title="Scope Distribution" />
          </div>
          {byScope.length > 0 && byScope.some((s) => s.total > 0) ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={byScope}
                  dataKey="total"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
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
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-400">
              No data yet.
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2: By Source + Top Emitters */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Emissions by Source */}
        <div ref={sourceRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="text-base font-semibold text-gray-900">By Source</h3>
              <span className="text-sm text-gray-400">Emission breakdown</span>
            </div>
            <PrintButton chartRef={sourceRef} title="Emissions By Source" />
          </div>
          {bySource.length > 0 ? (
            <div className="space-y-3">
              {bySource.slice(0, 8).map((source, i) => {
                const maxVal = bySource[0]?.total ?? 1;
                const pct = maxVal > 0 ? (source.total / maxVal) * 100 : 0;
                return (
                  <div key={source.sourceName} className="flex items-center gap-3">
                    <span className="w-40 truncate text-sm text-gray-700">{source.sourceName}</span>
                    <div className="flex-1">
                      <div className="h-2.5 w-full rounded-full bg-gray-100">
                        <div
                          className="h-2.5 rounded-full transition-all"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            backgroundColor: SOURCE_BAR_COLORS[i % SOURCE_BAR_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                    <span className="w-20 text-right text-sm font-semibold text-gray-900">
                      {formatNumber(source.total, 2)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              No emission sources yet.
            </div>
          )}
        </div>

        {/* Top Emitters by Scope (summary card) */}
        <div ref={breakdownRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h3 className="text-base font-semibold text-gray-900">Scope Breakdown</h3>
              <span className="text-sm text-gray-400">tCO2e by scope</span>
            </div>
            <PrintButton chartRef={breakdownRef} title="Scope Breakdown" />
          </div>
          <div className="space-y-4">
            {[
              { scope: 1, label: "Scope 1 - Direct", value: stats?.scope1 ?? 0, color: "#166534", desc: "Fleet fuel, LPG, refrigerants" },
              { scope: 2, label: "Scope 2 - Energy", value: stats?.scope2 ?? 0, color: "#22c55e", desc: "Purchased electricity, steam" },
              { scope: 3, label: "Scope 3 - Indirect", value: stats?.scope3 ?? 0, color: "#86efac", desc: "Travel, waste, water, logistics" },
            ].map((item) => (
              <div key={item.scope} className="rounded-lg border border-gray-50 bg-gray-50/50 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatNumber(item.value)}</p>
                    <p className="text-xs text-gray-400">
                      {total > 0 ? `${((item.value / total) * 100).toFixed(1)}%` : "0%"}
                    </p>
                  </div>
                </div>
                {total > 0 && (
                  <div className="mt-3 h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${(item.value / total) * 100}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
