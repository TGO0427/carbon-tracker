"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EMISSION_SOURCES } from "@/lib/constants";
import { calculateEmission } from "@/lib/calculations";
import { formatNumber } from "@/lib/utils";
import type { EmissionFactor, EmissionEntry, ReportingPeriod, Site } from "@/types";

interface EmissionFormProps {
  initialData?: EmissionEntry;
}

export function EmissionForm({ initialData }: EmissionFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [saving, setSaving] = useState(false);

  const [scope, setScope] = useState(initialData?.scope?.toString() ?? "1");
  const [sourceName, setSourceName] = useState(initialData?.sourceName ?? "");
  const [activityData, setActivityData] = useState(initialData?.activityData?.toString() ?? "");
  const [activityUnit, setActivityUnit] = useState(initialData?.activityUnit ?? "");
  const [emissionFactorId, setEmissionFactorId] = useState(initialData?.emissionFactorId ?? "");
  const [useCustomFactor, setUseCustomFactor] = useState(!!initialData?.customFactor);
  const [customFactor, setCustomFactor] = useState(initialData?.customFactor?.toString() ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [entryDate, setEntryDate] = useState(
    initialData?.entryDate ? new Date(initialData.entryDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [reportingPeriodId, setReportingPeriodId] = useState(initialData?.reportingPeriodId ?? "");
  const [siteId, setSiteId] = useState(initialData?.siteId ?? "");
  const [unitId, setUnitId] = useState(initialData?.unitId ?? "");

  useEffect(() => {
    fetch("/api/emission-factors").then((r) => r.json()).then(setFactors).catch(() => {});
    fetch("/api/sites").then((r) => r.json()).then(setSites).catch(() => {});
    fetch("/api/reporting-periods").then((r) => r.json()).then((data: ReportingPeriod[]) => {
      setPeriods(data);
      if (!initialData) {
        const active = data.find((p) => p.isActive);
        if (active) setReportingPeriodId(active.id);
      }
    }).catch(() => {});
  }, []);

  const filteredSources = EMISSION_SOURCES.filter((s) => s.scope === parseInt(scope));
  const selectedFactor = factors.find((f) => f.id === emissionFactorId);
  const effectiveFactor = useCustomFactor ? parseFloat(customFactor) || 0 : (selectedFactor?.factor ?? 0);
  const preview = calculateEmission(parseFloat(activityData) || 0, effectiveFactor);

  // Auto-select factor when source changes
  useEffect(() => {
    if (!sourceName) return;
    const match = factors.find((f) =>
      f.name.toLowerCase() === sourceName.toLowerCase() && f.scope === parseInt(scope)
    );
    if (match) {
      setEmissionFactorId(match.id);
      const src = EMISSION_SOURCES.find((s) => s.name === sourceName);
      if (src) setActivityUnit(src.defaultUnit);
    }
  }, [sourceName, factors, scope]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const sourceInfo = EMISSION_SOURCES.find((s) => s.name === sourceName);
    const payload = {
      scope: parseInt(scope),
      sourceName,
      sourceCategory: sourceInfo?.category ?? "other",
      activityData: parseFloat(activityData),
      activityUnit,
      emissionFactorId: useCustomFactor ? null : emissionFactorId || null,
      customFactor: useCustomFactor ? parseFloat(customFactor) : null,
      notes: notes || null,
      entryDate,
      reportingPeriodId: reportingPeriodId || null,
      siteId: siteId || null,
      unitId: unitId || null,
    };

    const url = isEdit ? `/api/emissions/${initialData.id}` : "/api/emissions";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) router.push("/emissions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Emission Entry" : "New Emission Entry"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              id="scope"
              label="Scope"
              value={scope}
              onChange={(e) => { setScope(e.target.value); setSourceName(""); }}
              options={[
                { value: "1", label: "Scope 1 - Direct" },
                { value: "2", label: "Scope 2 - Energy" },
                { value: "3", label: "Scope 3 - Other Indirect" },
              ]}
            />

            <Select
              id="sourceName"
              label="Emission Source"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="Select a source..."
              options={filteredSources.map((s) => ({ value: s.name, label: s.name }))}
            />

            <Input
              id="activityData"
              label="Activity Data"
              type="number"
              step="any"
              value={activityData}
              onChange={(e) => setActivityData(e.target.value)}
              placeholder="e.g., 294919.5"
            />

            <Input
              id="activityUnit"
              label="Unit"
              value={activityUnit}
              onChange={(e) => setActivityUnit(e.target.value)}
              placeholder="e.g., litres, kWh, kg"
            />

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={useCustomFactor}
                  onChange={(e) => setUseCustomFactor(e.target.checked)}
                  className="rounded"
                />
                Use custom emission factor
              </label>
              {useCustomFactor ? (
                <Input
                  id="customFactor"
                  type="number"
                  step="any"
                  value={customFactor}
                  onChange={(e) => setCustomFactor(e.target.value)}
                  placeholder="Enter custom factor"
                />
              ) : (
                <p className="text-sm text-gray-500">
                  {selectedFactor
                    ? `${selectedFactor.factor} ${selectedFactor.unit} (${selectedFactor.source})`
                    : "Select a source to auto-fill factor"}
                </p>
              )}
            </div>

            <Input
              id="entryDate"
              label="Entry Date"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />

            <Select
              id="reportingPeriod"
              label="Reporting Period"
              value={reportingPeriodId}
              onChange={(e) => setReportingPeriodId(e.target.value)}
              placeholder="Select period..."
              options={periods.map((p) => ({ value: p.id, label: p.name }))}
            />

            <Select
              id="site"
              label="Site"
              value={siteId}
              onChange={(e) => { setSiteId(e.target.value); setUnitId(""); }}
              placeholder="Select site..."
              options={sites.map((s) => ({ value: s.id, label: `${s.name} (${s.location})` }))}
            />

            <Select
              id="unit"
              label="Unit"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              placeholder={siteId ? "Select unit..." : "Select a site first"}
              options={
                (sites.find((s) => s.id === siteId)?.units ?? []).map((u) => ({
                  value: u.id,
                  label: u.number ? `${u.name} (${u.number})` : u.name,
                }))
              }
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </CardContent>
      </Card>

      {parseFloat(activityData) > 0 && effectiveFactor > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-600">
              {formatNumber(parseFloat(activityData))} {activityUnit} &times; {effectiveFactor} ={" "}
              <span className="font-bold text-gray-900">{formatNumber(preview * 1000, 2)} kg CO2e</span>
              {" = "}
              <span className="font-bold text-emerald-600">{formatNumber(preview, 4)} tCO2e</span>
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : isEdit ? "Update Entry" : "Create Entry"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/emissions")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
