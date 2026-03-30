"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Target, Plus, Trash2, TrendingDown, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { Site } from "@/types";

interface TargetWithProgress {
  id: string;
  year: number;
  scope: number | null;
  targetEmissions: number;
  baselineYear: number;
  baselineEmissions: number;
  siteId: string | null;
  site: Site | null;
  notes: string | null;
  actual: number;
  progress: number;
  reduction: number;
  onTrack: boolean;
}

export default function TargetsPage() {
  const [targets, setTargets] = useState<TargetWithProgress[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [scope, setScope] = useState("");
  const [targetEmissions, setTargetEmissions] = useState("");
  const [baselineYear, setBaselineYear] = useState(String(new Date().getFullYear() - 1));
  const [baselineEmissions, setBaselineEmissions] = useState("");
  const [siteId, setSiteId] = useState("");
  const [notes, setNotes] = useState("");

  const fetchTargets = () => {
    setLoading(true);
    fetch("/api/targets")
      .then((r) => r.json())
      .then(setTargets)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTargets();
    fetch("/api/sites").then((r) => r.json()).then(setSites).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: parseInt(year),
          scope: scope ? parseInt(scope) : null,
          targetEmissions: parseFloat(targetEmissions),
          baselineYear: parseInt(baselineYear),
          baselineEmissions: parseFloat(baselineEmissions),
          siteId: siteId || null,
          notes: notes || null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setTargetEmissions(""); setBaselineEmissions(""); setNotes(""); setScope(""); setSiteId("");
        fetchTargets();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this target?")) return;
    await fetch(`/api/targets/${id}`, { method: "DELETE" });
    fetchTargets();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emission Targets"
        description="Set reduction targets and track progress"
        action={
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4" /> {showForm ? "Cancel" : "Set Target"}
          </Button>
        }
      />

      {/* Add Target Form */}
      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Emission Target</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input id="year" label="Target Year" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
              <Select
                id="scope" label="Scope (optional)" value={scope}
                onChange={(e) => setScope(e.target.value)}
                placeholder="All scopes"
                options={[
                  { value: "1", label: "Scope 1" },
                  { value: "2", label: "Scope 2" },
                  { value: "3", label: "Scope 3" },
                ]}
              />
              <Select
                id="site" label="Site (optional)" value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="All sites"
                options={sites.map((s) => ({ value: s.id, label: s.name }))}
              />
              <Input id="target" label="Target Emissions (tCO2e)" type="number" step="any" value={targetEmissions} onChange={(e) => setTargetEmissions(e.target.value)} placeholder="e.g., 3500" />
              <Input id="baseYear" label="Baseline Year" type="number" value={baselineYear} onChange={(e) => setBaselineYear(e.target.value)} />
              <Input id="baseEmissions" label="Baseline Emissions (tCO2e)" type="number" step="any" value={baselineEmissions} onChange={(e) => setBaselineEmissions(e.target.value)} placeholder="e.g., 4190" />
              <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Create Target"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Target Cards */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : targets.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Target className="h-12 w-12" />}
            title="No emission targets set"
            description="Set your first reduction target to start tracking progress."
            action={<Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Set Target</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {targets.map((t) => {
            const progressColor = t.onTrack ? "bg-emerald-500" : "bg-red-500";
            const progressPct = Math.min(t.progress, 100);
            return (
              <Card key={t.id} className="relative">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {t.onTrack ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <h4 className="font-semibold text-gray-900">
                          {t.year} Target{t.scope ? ` — Scope ${t.scope}` : ""}
                        </h4>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        {t.site?.name ?? "All Sites"} &middot; Baseline: {t.baselineYear} ({formatNumber(t.baselineEmissions)} tCO2e)
                      </p>
                    </div>
                    <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm text-gray-500">
                        {formatNumber(t.actual)} / {formatNumber(t.targetEmissions)} tCO2e
                      </span>
                      <span className={`text-sm font-bold ${t.onTrack ? "text-emerald-600" : "text-red-500"}`}>
                        {t.progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-gray-100">
                      <div className={`h-3 rounded-full ${progressColor} transition-all`} style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>

                  {/* Reduction from baseline */}
                  <div className="mt-4 flex items-center gap-2">
                    {t.reduction > 0 ? (
                      <TrendingDown className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${t.reduction > 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {t.reduction > 0 ? "" : "+"}{Math.abs(t.reduction).toFixed(1)}% vs {t.baselineYear}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({formatNumber(Math.abs(t.baselineEmissions - t.actual), 1)} tCO2e {t.reduction > 0 ? "reduced" : "increase"})
                    </span>
                  </div>

                  {t.notes && <p className="mt-3 text-xs text-gray-400">{t.notes}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
