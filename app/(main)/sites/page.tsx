"use client";

import { useEffect, useState } from "react";
import { useDateFilter } from "@/lib/date-filter-context";
import { SITES } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import {
  MapPin, Building2, ChevronRight, ChevronLeft,
  Flame, Zap, Globe, ArrowLeft,
} from "lucide-react";
import { SCOPE_CHART_COLORS } from "@/lib/constants";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";

interface UnitSource {
  sourceName: string;
  scope: number;
  total: number;
  activityData: number;
  activityUnit: string;
}

interface UnitBreakdown {
  unitId: string;
  unitName: string;
  unitNumber: string | null;
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  sources: UnitSource[];
}

interface FacilityBreakdown {
  facility: string;
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  units: UnitBreakdown[];
}

interface SiteEmissions {
  siteId: string;
  scope1: number;
  scope2: number;
  scope3: number;
  total: number;
  facilities: FacilityBreakdown[];
}

type DrillLevel = "sites" | "facilities" | "units";

export default function SitesPage() {
  const { buildQuery } = useDateFilter();
  const [level, setLevel] = useState<DrillLevel>("sites");
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);
  const [siteData, setSiteData] = useState<Record<string, SiteEmissions>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Strip siteId — this page fetches all sites and handles its own navigation
    const params = new URLSearchParams(buildQuery());
    params.delete("siteId");
    const q = params.toString();
    Promise.all(
      SITES.map((site) =>
        fetch(`/api/sites/${site.id}/emissions?${q}`)
          .then((r) => r.json())
          .then((data: SiteEmissions) => ({ id: site.id, data }))
      )
    ).then((results) => {
      const map: Record<string, SiteEmissions> = {};
      for (const r of results) map[r.id] = r.data;
      setSiteData(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [buildQuery]);

  const goBack = () => {
    if (level === "units") {
      setLevel("facilities");
      setSelectedFacility(null);
    } else if (level === "facilities") {
      setLevel("sites");
      setSelectedSiteId(null);
    }
  };

  const selectedSite = selectedSiteId ? SITES.find((s) => s.id === selectedSiteId) : null;
  const siteEmissions = selectedSiteId ? siteData[selectedSiteId] : null;
  const facilityData = selectedFacility
    ? siteEmissions?.facilities.find((f) => f.facility === selectedFacility)
    : null;

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Sites" description="Emissions by site, facility, and unit" />
        <div className="flex justify-center py-12"><Spinner /></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div>
        {level !== "sites" && (
          <button onClick={goBack} className="mb-2 flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        )}
        <PageHeader
          title={
            level === "sites" ? "Sites" :
            level === "facilities" ? `${selectedSite?.name ?? ""}` :
            `${selectedSite?.name ?? ""} — ${selectedFacility ?? ""}`
          }
          description={
            level === "sites" ? "Emissions breakdown by site, facility, and unit" :
            level === "facilities" ? `Facility breakdown for ${selectedSite?.location ?? ""}` :
            `Unit-level breakdown for ${selectedFacility}`
          }
        />
      </div>

      {/* ── LEVEL 1: Site Cards ── */}
      {level === "sites" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {SITES.map((site) => {
            const data = siteData[site.id];
            const total = data?.total ?? 0;
            return (
              <button
                key={site.id}
                onClick={() => { setSelectedSiteId(site.id); setLevel("facilities"); }}
                className="group rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700 transition-all text-left"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-2.5">
                      <MapPin className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{site.name}</h3>
                      <p className="text-sm text-gray-400">{site.location}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </div>

                <div className="mt-5 grid grid-cols-4 gap-3">
                  <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
                    <p className="text-xs font-medium text-gray-400">Total</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatNumber(total)}</p>
                    <p className="text-[10px] text-gray-400">tCO2e</p>
                  </div>
                  {[
                    { label: "Scope 1", val: data?.scope1 ?? 0, color: SCOPE_CHART_COLORS[1], icon: Flame },
                    { label: "Scope 2", val: data?.scope2 ?? 0, color: SCOPE_CHART_COLORS[2], icon: Zap },
                    { label: "Scope 3", val: data?.scope3 ?? 0, color: SCOPE_CHART_COLORS[3], icon: Globe },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-3">
                      <p className="text-xs font-medium text-gray-400">{s.label}</p>
                      <p className="text-lg font-bold" style={{ color: s.color }}>{formatNumber(s.val)}</p>
                      <p className="text-[10px] text-gray-400">tCO2e</p>
                    </div>
                  ))}
                </div>

                {/* Facility count */}
                <p className="mt-4 text-xs text-gray-400">
                  {data?.facilities.length ?? 0} facilities — click to drill down
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* ── LEVEL 2: Facility Breakdown ── */}
      {level === "facilities" && siteEmissions && (
        <>
          {/* Site totals KPI row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Emissions", val: siteEmissions.total, color: "#059669" },
              { label: "Scope 1", val: siteEmissions.scope1, color: SCOPE_CHART_COLORS[1] },
              { label: "Scope 2", val: siteEmissions.scope2, color: SCOPE_CHART_COLORS[2] },
              { label: "Scope 3", val: siteEmissions.scope3, color: SCOPE_CHART_COLORS[3] },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-400">{k.label}</p>
                <p className="text-2xl font-bold" style={{ color: k.color }}>{formatNumber(k.val)}</p>
                <p className="text-xs text-gray-400">tCO2e</p>
              </div>
            ))}
          </div>

          {/* Facility bar chart + cards */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Emissions by Facility</h3>
              {siteEmissions.facilities.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={siteEmissions.facilities} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "#9ca3af" }} />
                    <YAxis type="category" dataKey="facility" tick={{ fontSize: 12, fill: "#6b7280" }} width={120} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
                    />
                    <Legend />
                    <Bar dataKey="scope1" stackId="a" fill={SCOPE_CHART_COLORS[1]} name="Scope 1" />
                    <Bar dataKey="scope2" stackId="a" fill={SCOPE_CHART_COLORS[2]} name="Scope 2" />
                    <Bar dataKey="scope3" stackId="a" fill={SCOPE_CHART_COLORS[3]} name="Scope 3" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-gray-400">No emission data for this site.</p>
              )}
            </Card>

            {/* Scope pie for this site */}
            <Card className="p-5 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Scope Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Scope 1", value: siteEmissions.scope1 },
                      { name: "Scope 2", value: siteEmissions.scope2 },
                      { name: "Scope 3", value: siteEmissions.scope3 },
                    ]}
                    dataKey="value"
                    nameKey="name"
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={95}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                  >
                    <Cell fill={SCOPE_CHART_COLORS[1]} />
                    <Cell fill={SCOPE_CHART_COLORS[2]} />
                    <Cell fill={SCOPE_CHART_COLORS[3]} />
                  </Pie>
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)} tCO2e`} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Facility cards - clickable to drill into units */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Facilities</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {siteEmissions.facilities.map((fac) => {
              const pct = siteEmissions.total > 0 ? (fac.total / siteEmissions.total) * 100 : 0;
              return (
                <button
                  key={fac.facility}
                  onClick={() => { setSelectedFacility(fac.facility); setLevel("units"); }}
                  className="group rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-700 transition-all text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-emerald-600" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">{fac.facility}</h4>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                  <p className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{formatNumber(fac.total)} <span className="text-sm font-normal text-gray-400">tCO2e</span></p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                    <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{pct.toFixed(1)}% of site total</p>
                  <div className="mt-3 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span><span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: SCOPE_CHART_COLORS[1] }} />S1: {formatNumber(fac.scope1)}</span>
                    <span><span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: SCOPE_CHART_COLORS[2] }} />S2: {formatNumber(fac.scope2)}</span>
                    <span><span className="inline-block h-2 w-2 rounded-full mr-1" style={{ backgroundColor: SCOPE_CHART_COLORS[3] }} />S3: {formatNumber(fac.scope3)}</span>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-400">{fac.units.length} unit{fac.units.length !== 1 ? "s" : ""}</p>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── LEVEL 3: Unit Breakdown ── */}
      {level === "units" && facilityData && (
        <>
          {/* Facility totals */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Facility Total", val: facilityData.total, color: "#059669" },
              { label: "Scope 1", val: facilityData.scope1, color: SCOPE_CHART_COLORS[1] },
              { label: "Scope 2", val: facilityData.scope2, color: SCOPE_CHART_COLORS[2] },
              { label: "Scope 3", val: facilityData.scope3, color: SCOPE_CHART_COLORS[3] },
            ].map((k) => (
              <div key={k.label} className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
                <p className="text-xs font-medium text-gray-400">{k.label}</p>
                <p className="text-2xl font-bold" style={{ color: k.color }}>{formatNumber(k.val)}</p>
                <p className="text-xs text-gray-400">tCO2e</p>
              </div>
            ))}
          </div>

          {/* Units comparison bar chart */}
          <Card className="p-5 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Emissions by Unit</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={facilityData.units.map((u) => ({ name: u.unitNumber ?? u.unitName, ...u }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 12, fill: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
                  formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
                />
                <Legend />
                <Bar dataKey="scope1" stackId="a" fill={SCOPE_CHART_COLORS[1]} name="Scope 1" />
                <Bar dataKey="scope2" stackId="a" fill={SCOPE_CHART_COLORS[2]} name="Scope 2" />
                <Bar dataKey="scope3" stackId="a" fill={SCOPE_CHART_COLORS[3]} name="Scope 3" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Per-unit detail cards with source breakdown */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Unit Details</h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {facilityData.units.map((unit) => (
              <Card key={unit.unitId} className="p-5 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {unit.unitNumber ?? unit.unitName}
                  </h4>
                  <span className="ml-auto text-lg font-bold text-gray-900 dark:text-white">{formatNumber(unit.total)} <span className="text-sm font-normal text-gray-400">tCO2e</span></span>
                </div>

                {/* Scope summary row */}
                <div className="flex gap-4 mb-4 text-sm text-gray-600 dark:text-gray-300">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SCOPE_CHART_COLORS[1] }} />
                    Scope 1: {formatNumber(unit.scope1)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SCOPE_CHART_COLORS[2] }} />
                    Scope 2: {formatNumber(unit.scope2)}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SCOPE_CHART_COLORS[3] }} />
                    Scope 3: {formatNumber(unit.scope3)}
                  </span>
                </div>

                {/* Source breakdown table */}
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/60">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Source</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Activity</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">tCO2e</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {[...unit.sources].sort((a, b) => b.total - a.total).map((src, idx) => (
                      <tr key={idx} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-700/30">
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{src.sourceName}</td>
                        <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">
                          {formatNumber(src.activityData)} {src.activityUnit}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-white">{formatNumber(src.total, 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
