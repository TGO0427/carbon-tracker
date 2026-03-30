"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScopeBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Flame, Trash2, Pencil, X } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emission Sources"
        description="Track your Scope 1, 2, and 3 emissions"
        action={
          <Link href="/emissions/new">
            <Button><Plus className="h-4 w-4" /> Add Emission</Button>
          </Link>
        }
      />

      <div className="flex gap-2">
        {["", "1", "2", "3"].map((s) => (
          <button
            key={s}
            onClick={() => setScopeFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              scopeFilter === s
                ? "bg-emerald-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s === "" ? "All" : `Scope ${s}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : emissions.length === 0 ? (
        <Card>
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
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={emissions.length > 0 && selectedIds.size === emissions.length}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Source</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Site</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Scope</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Activity Data</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Emissions (tCO2e)</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {emissions.map((e) => (
                  <tr key={e.id} className={`border-b last:border-0 hover:bg-gray-50 ${selectedIds.has(e.id) ? "bg-emerald-50" : ""}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(e.id)}
                        onChange={() => toggleSelect(e.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{e.sourceName}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {e.site?.name ?? "—"}
                      {e.unit?.name ? <span className="text-gray-400"> / {e.unit.name}{e.unit.number ? ` (${e.unit.number})` : ""}</span> : ""}
                    </td>
                    <td className="px-4 py-3"><ScopeBadge scope={e.scope} /></td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {formatNumber(e.activityData)} {e.activityUnit}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatNumber(e.totalEmissions, 4)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(e.entryDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/emissions/${e.id}`}>
                          <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
          <div className="flex items-center gap-4 rounded-lg border border-gray-200 bg-white px-6 py-3 shadow-lg">
            <span className="text-sm font-medium text-gray-700">
              {selectedIds.size} selected
            </span>
            <Button
              variant="danger"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4" /> Delete Selected
            </Button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-1 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
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
