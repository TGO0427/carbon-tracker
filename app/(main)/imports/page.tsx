"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Zap, Droplets, Flame, Fuel } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { ReportingPeriod } from "@/types";

interface ParsedUnit {
  unitId: string;
  unitLabel: string;
  pct: number;
}

interface ParsedEntry {
  section: string;
  facility: string;
  siteId: string;
  month: string;
  activityData: number;
  activityUnit: string;
  scope: number;
  sourceName: string;
  sourceCategory: string;
  emissionFactorName: string;
  factor: number;
  totalEmissions: number;
  units: ParsedUnit[];
}

interface ParseResult {
  year: number;
  fileName: string;
  entryCount: number;
  entries: ParsedEntry[];
  summary: { electricity: number; water: number; lpg: number; diesel: number };
}

type ImportStep = "upload" | "preview" | "importing" | "done";

export default function ImportsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [importResult, setImportResult] = useState<{ created: number } | null>(null);
  const [previewSection, setPreviewSection] = useState<string>("all");

  useEffect(() => {
    fetch("/api/reporting-periods").then((r) => r.json()).then((data: ReportingPeriod[]) => {
      setPeriods(data);
      const active = data.find((p) => p.isActive);
      if (active) setSelectedPeriodId(active.id);
    }).catch(() => {});
  }, []);

  const handleUpload = async (file: File) => {
    setError(null);
    setParsing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/imports", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to parse file");
      }
      const data: ParseResult = await res.json();
      if (data.entryCount === 0) {
        throw new Error("No recognizable data found in the file. Make sure it follows the expected format.");
      }
      setParseResult(data);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!parseResult) return;
    setStep("importing");
    try {
      const res = await fetch("/api/imports/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: parseResult.entries,
          reportingPeriodId: selectedPeriodId || null,
        }),
      });
      if (!res.ok) throw new Error("Import failed");
      const result = await res.json();
      setImportResult(result);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStep("preview");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setParseResult(null);
    setError(null);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const filteredEntries = parseResult?.entries.filter(
    (e) => previewSection === "all" || e.section === previewSection
  ) ?? [];

  // Group entries by facility + section for summary
  const facilitySummary = parseResult ? (() => {
    const map: Record<string, { facility: string; section: string; scope: number; total: number; months: number; unit: string }> = {};
    for (const e of parseResult.entries) {
      const key = `${e.facility}-${e.section}`;
      if (!map[key]) map[key] = { facility: e.facility, section: e.section, scope: e.scope, total: 0, months: 0, unit: e.activityUnit };
      map[key].total += e.activityData;
      map[key].months++;
    }
    return Object.values(map);
  })() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import Data"
        description="Upload monthly emission data from Excel"
      />

      {/* ── STEP 1: Upload ── */}
      {step === "upload" && (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-emerald-50 p-4">
                <Upload className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Upload Excel File</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Upload your monthly data file (e.g., "Data 2025.xlsx") with electricity, water, LPG, and diesel sections.
                </p>
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />

              <Button
                onClick={() => fileRef.current?.click()}
                disabled={parsing}
                className="mt-2"
              >
                {parsing ? <><Spinner /> Parsing...</> : <><FileSpreadsheet className="h-4 w-4" /> Select File</>}
              </Button>

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}

              <div className="mt-6 rounded-lg bg-gray-50 p-4 text-sm text-gray-500 max-w-lg">
                <p className="font-medium text-gray-700 mb-2">Expected format:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Section headers: "ELECTRICITY USAGE", "WATER CONSUMPTION", "LP GAS USAGE", "FUEL USAGE"</li>
                  <li>Facility rows: "Impilo - KWH", "Sizwe - KWH", "ISO Foods - KWH", etc.</li>
                  <li>Columns B-M = Jan-Dec monthly values</li>
                  <li>Year detected from header (e.g., "ELECTRICITY USAGE 2025")</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Preview ── */}
      {step === "preview" && parseResult && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Electricity", count: parseResult.summary.electricity, icon: Zap, color: "text-yellow-600", bg: "bg-yellow-50" },
              { label: "Water", count: parseResult.summary.water, icon: Droplets, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "LPG Gas", count: parseResult.summary.lpg, icon: Flame, color: "text-orange-600", bg: "bg-orange-50" },
              { label: "Diesel", count: parseResult.summary.diesel, icon: Fuel, color: "text-gray-600", bg: "bg-gray-100" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className={`rounded-lg p-2 ${s.bg}`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">{s.label}</p>
                    <p className="text-lg font-bold text-gray-900">{s.count} <span className="text-xs font-normal text-gray-400">entries</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Preview: {parseResult.fileName} ({parseResult.year})
                </CardTitle>
                <p className="text-sm text-gray-400">{parseResult.entryCount} facility-month entries found</p>
              </div>
            </CardHeader>
            <CardContent>
              {/* Facility summary table */}
              <h4 className="mb-3 text-sm font-semibold text-gray-700">Facility Summary</h4>
              <table className="mb-6 w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Facility</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Type</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">Scope</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Total</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">Months</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500">tCO2e</th>
                  </tr>
                </thead>
                <tbody>
                  {facilitySummary.map((f, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium text-gray-900">{f.facility}</td>
                      <td className="px-3 py-2 text-gray-600 capitalize">{f.section}</td>
                      <td className="px-3 py-2 text-gray-600">Scope {f.scope}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{formatNumber(f.total)} {f.unit}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{f.months}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900">
                        {formatNumber((f.total * (f.section === "electricity" ? 0.82 : f.section === "water" ? 0.34 : f.section === "lpg" ? 3.02 : 2.68)) / 1000, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Section filter */}
              <div className="mb-3 flex gap-2">
                {["all", "electricity", "water", "lpg", "diesel"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPreviewSection(s)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      previewSection === s ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>

              {/* Detail table */}
              <div className="max-h-[400px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="border-b bg-gray-50">
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Facility</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Month</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">Activity</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500">tCO2e</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((e, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{e.facility}</td>
                        <td className="px-3 py-2 text-gray-600">{e.month}</td>
                        <td className="px-3 py-2 text-right text-gray-600">{formatNumber(e.activityData)} {e.activityUnit}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatNumber(e.totalEmissions, 4)}</td>
                        <td className="px-3 py-2 text-gray-400 text-xs">
                          {e.units.map((u) => `${u.unitLabel} (${Math.round(u.pct * 100)}%)`).join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Reporting period + actions */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-700">Reporting Period:</label>
                  <select
                    value={selectedPeriodId}
                    onChange={(e) => setSelectedPeriodId(e.target.value)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    <option value="">None</option>
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleReset}>Cancel</Button>
                  <Button onClick={handleConfirm}>
                    Import {parseResult.entryCount} Entries
                  </Button>
                </div>
              </div>
              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4" /> {error}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── STEP 3: Importing ── */}
      {step === "importing" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Spinner />
            <p className="text-sm text-gray-500">Importing entries into database...</p>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 4: Done ── */}
      {step === "done" && importResult && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="rounded-full bg-emerald-50 p-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Import Complete</h3>
            <p className="text-sm text-gray-500">
              Successfully created <span className="font-bold text-gray-900">{importResult.created}</span> emission entries.
            </p>
            <Button onClick={handleReset} className="mt-4">Import Another File</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
