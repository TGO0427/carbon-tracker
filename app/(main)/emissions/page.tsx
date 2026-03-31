"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ScopeBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Flame, Trash2, Pencil, X, Zap, Globe, Activity } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { EmissionEntry } from "@/types";

function EmissionsContent() {
  const searchParams = useSearchParams();
  const [emissions, setEmissions] = useState<EmissionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scopeFilter, setScopeFilter] = useState(searchParams.get("scope") ?? "");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchEmissions = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (scopeFilter) params.set("scope", scopeFilter);
    fetch(`/api/emissions?${params}`)
      .then((r) => r.json())
      .then(setEmissions)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEmissions(); }, [scopeFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this emission entry?")) return;
    await fetch(`/api/emissions/${id}`, { method: "DELETE" });
    fetchEmissions();
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Delete ${count} selected emission ${count === 1 ? "entry" : "entries"}?`)) return;
    await fetch("/api/emissions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    setSelectedIds(new Set());
    fetchEmissions();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === emissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emissions.map((e) => e.id)));
    }
  };

  // Summary stats
  const totalEmissions = emissions.reduce((s, e) => s + e.totalEmissions, 0);
  const scope1Total = emissions.filter((e) => e.scope === 1).reduce((s, e) => s + e.totalEmissions, 0);
  const scope2Total = emissions.filter((e) => e.scope === 2).reduce((s, e) => s + e.totalEmissions, 0);
  const scope3Total = emissions.filter((e) => e.scope === 3).reduce((s, e) => s + e.totalEmissions, 0);
  const scope1Count = emissions.filter((e) => e.scope === 1).length;
  const scope2Count = emissions.filter((e) => e.scope === 2).length;
  const scope3Count = emissions.filter((e) => e.scope === 3).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Emission Sources"
        description="Track your Scope 1, 2, and 3 emissions"
        action={
          <Link href="/emissions/new">
            <Button><Plus className="h-4 w-4" /> Add Emission</Button>
          </Link>
        }
      />

      {/* Summary Strip */}
      {!loading && emissions.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
          {/* Total — slightly more prominent */}
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70">Total</span>
            </div>
            <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">{formatNumber(totalEmissions)} <span className="text-[10px] font-normal text-gray-400">tCO2e</span></p>
          </div>
          {[
            { icon: <Flame className="h-3.5 w-3.5" />, color: "text-green-800", tint: "border-green-100 dark:border-green-900 bg-green-50/40 dark:bg-green-950/20", label: "Scope 1", val: scope1Total, count: scope1Count },
            { icon: <Zap className="h-3.5 w-3.5" />, color: "text-green-600", tint: "border-green-100 dark:border-green-900 bg-green-50/30 dark:bg-green-950/20", label: "Scope 2", val: scope2Total, count: scope2Count },
            { icon: <Globe className="h-3.5 w-3.5" />, color: "text-emerald-500", tint: "border-emerald-100 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20", label: "Scope 3", val: scope3Total, count: scope3Count },
          ].map((s) => (
            <div key={s.label} className={`rounded-lg border ${s.tint} px-3.5 py-2.5`}>
              <div className="flex items-center gap-1.5">
                <div className={s.color}>{s.icon}</div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{s.label}</span>
              </div>
              <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">{formatNumber(s.val)} <span className="text-[10px] font-normal text-gray-400">{s.count} entries</span></p>
            </div>
          ))}
          <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 px-3.5 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Entries</span>
            <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">{emissions.length}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        {["", "1", "2", "3"].map((s) => (
          <button
            key={s}
            onClick={() => { setScopeFilter(s); setSelectedIds(new Set()); }}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
              scopeFilter === s
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 hover:text-emerald-700"
            }`}
          >
            {s === "" ? "All" : `Scope ${s}`}
          </button>
        ))}
        {emissions.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">
            {emissions.length} {emissions.length === 1 ? "entry" : "entries"}
          </span>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : emissions.length === 0 ? (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
          <EmptyState
            icon={<Flame className="h-12 w-12" />}
            title="No emission entries yet"
            description="Start tracking your carbon emissions by adding your first entry."
            action={
              <Link href="/emissions/new">
                <Button><Plus className="h-4 w-4" /> Add Emission</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-700/50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={emissions.length > 0 && selectedIds.size === emissions.length}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Source</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Site</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Scope</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Activity</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">tCO2e</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Date</th>
                  <th className="w-24 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {emissions.map((e) => (
                  <tr
                    key={e.id}
                    className={`transition-colors ${
                      selectedIds.has(e.id)
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30"
                        : "hover:bg-gray-50/80 dark:hover:bg-gray-700/30"
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(e.id)}
                        onChange={() => toggleSelect(e.id)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900 dark:text-white">{e.sourceName}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-gray-600 dark:text-gray-300">{e.site?.name ?? "—"}</p>
                      {e.unit?.name && (
                        <p className="text-[11px] text-gray-400">{e.unit.name}{e.unit.number ? ` (${e.unit.number})` : ""}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5"><ScopeBadge scope={e.scope} /></td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="text-gray-700 dark:text-gray-200">{formatNumber(e.activityData)}</p>
                      <p className="text-[10px] text-gray-400">{e.activityUnit}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">{formatNumber(e.totalEmissions, 4)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 dark:text-gray-400 text-xs">
                      {new Date(e.entryDate).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end">
                        <div className="inline-flex rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden opacity-60 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                          <Link href={`/emissions/${e.id}`}>
                            <button className="px-2 py-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-emerald-600 transition-colors">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </Link>
                          <div className="w-px bg-gray-100 dark:bg-gray-700" />
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="px-2 py-1.5 text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Floating bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-5 py-2.5 shadow-xl">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {selectedIds.size} selected
            </span>
            <div className="h-4 w-px bg-gray-200 dark:bg-gray-600" />
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmissionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
      <EmissionsContent />
    </Suspense>
  );
}
