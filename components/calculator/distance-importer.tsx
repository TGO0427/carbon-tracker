"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatNumber } from "@/lib/utils";
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
  Car, Plane, Train, Bus, Truck, MapPin, Download, Trash2,
} from "lucide-react";

// ─── Emission factors kg CO₂ per km ──────────────────────────────────────────
const EMISSION_FACTORS: Record<string, { label: string; factor: number; icon: React.ReactNode }> = {
  car:      { label: "Car (petrol)",  factor: 0.192, icon: <Car className="h-3.5 w-3.5" /> },
  car_ev:   { label: "Car (EV)",      factor: 0.053, icon: <Car className="h-3.5 w-3.5" /> },
  flight:   { label: "Flight",        factor: 0.255, icon: <Plane className="h-3.5 w-3.5" /> },
  train:    { label: "Train",         factor: 0.041, icon: <Train className="h-3.5 w-3.5" /> },
  bus:      { label: "Bus",           factor: 0.089, icon: <Bus className="h-3.5 w-3.5" /> },
  truck:    { label: "Truck",         factor: 0.210, icon: <Truck className="h-3.5 w-3.5" /> },
};

function normaliseTransport(raw: unknown): string {
  if (!raw) return "car";
  const v = String(raw).toLowerCase().trim();
  if (v.includes("ev") || v.includes("electric")) return "car_ev";
  if (v.includes("flight") || v.includes("air") || v.includes("plane")) return "flight";
  if (v.includes("train") || v.includes("rail")) return "train";
  if (v.includes("bus") || v.includes("coach")) return "bus";
  if (v.includes("truck") || v.includes("lorry") || v.includes("freight")) return "truck";
  return "car";
}

// ─── Haversine distance (km) ──────────────────────────────────────────────────
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Nominatim geocoder ───────────────────────────────────────────────────────
const geocodeCache: Record<string, { lat: number; lon: number } | null> = {};
async function geocode(place: string): Promise<{ lat: number; lon: number } | null> {
  if (geocodeCache[place] !== undefined) return geocodeCache[place];
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "en" } });
  const data = await res.json();
  if (!data.length) { geocodeCache[place] = null; return null; }
  const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  geocodeCache[place] = result;
  return result;
}

// ─── Column detection ─────────────────────────────────────────────────────────
function findColumn(keys: string[], patterns: RegExp[]): string | undefined {
  return keys.find((k) => patterns.some((p) => p.test(k)));
}

interface DistanceRecord {
  id: number;
  place1: string;
  place2: string;
  transport: string;
  distanceKm: number | null;
  emissionsKg: number | null;
  emissionsTonne: number | null;
  status: "pending" | "processing" | "done" | "error";
  extra: Record<string, unknown>;
}

const STATUS_CONFIG = {
  pending:    { bg: "bg-gray-100 dark:bg-gray-700", color: "text-gray-500 dark:text-gray-400", label: "Pending" },
  processing: { bg: "bg-blue-100 dark:bg-blue-900/40", color: "text-blue-700 dark:text-blue-400", label: "Processing" },
  done:       { bg: "bg-emerald-100 dark:bg-emerald-900/40", color: "text-emerald-700 dark:text-emerald-400", label: "Done" },
  error:      { bg: "bg-red-100 dark:bg-red-900/40", color: "text-red-700 dark:text-red-400", label: "Not found" },
};

export function DistanceImporter({ onSaved }: { onSaved?: () => void } = {}) {
  const [records, setRecords] = useState<DistanceRecord[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Parse xlsx ──────────────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    if (!file) return;
    setSaved(false);
    setStatusMsg("Reading file…");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

        if (!rows.length) { setStatusMsg("File appears empty."); return; }

        const keys = Object.keys(rows[0]);
        const col1 = findColumn(keys, [/^place.?1$/i, /^from$/i, /^origin$/i]);
        const col2 = findColumn(keys, [/^place.?2$/i, /^to$/i, /^dest/i]);
        const colT = findColumn(keys, [/transport/i, /mode/i, /type/i]);

        if (!col1 || !col2) {
          setStatusMsg('Could not find "Place 1" and "Place 2" columns.');
          return;
        }

        const parsed: DistanceRecord[] = rows
          .map((r, i) => ({
            id: i,
            place1: String(r[col1] || "").trim(),
            place2: String(r[col2] || "").trim(),
            transport: normaliseTransport(colT ? r[colT] : null),
            distanceKm: null,
            emissionsKg: null,
            emissionsTonne: null,
            status: "pending" as const,
            extra: Object.fromEntries(
              Object.entries(r).filter(([k]) => k !== col1 && k !== col2 && k !== colT)
            ),
          }))
          .filter((r) => r.place1 && r.place2);

        if (!parsed.length) { setStatusMsg("No valid rows found."); return; }

        setRecords(parsed);
        runCalculations(parsed);
      } catch (err) {
        setStatusMsg("Failed to read file: " + (err instanceof Error ? err.message : "Unknown error"));
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // ── Geocode + calculate ─────────────────────────────────────────────────────
  const runCalculations = async (rows: DistanceRecord[]) => {
    const updated = [...rows];
    setStatusMsg(`Calculating distances for ${rows.length} rows…`);

    for (let i = 0; i < rows.length; i++) {
      updated[i] = { ...updated[i], status: "processing" };
      setRecords([...updated]);

      try {
        await new Promise((r) => setTimeout(r, i === 0 ? 0 : 350));
        const [g1, g2] = await Promise.all([geocode(rows[i].place1), geocode(rows[i].place2)]);

        if (!g1 || !g2) {
          updated[i] = { ...updated[i], status: "error" };
        } else {
          const km = haversine(g1.lat, g1.lon, g2.lat, g2.lon);
          const factor = EMISSION_FACTORS[rows[i].transport]?.factor ?? 0.192;
          const emKg = km * factor;
          updated[i] = {
            ...updated[i],
            distanceKm: km,
            emissionsKg: emKg,
            emissionsTonne: emKg / 1000,
            status: "done",
          };
        }
      } catch {
        updated[i] = { ...updated[i], status: "error" };
      }

      setRecords([...updated]);
    }

    const doneCount = updated.filter((r) => r.status === "done").length;
    setStatusMsg(`Done — ${doneCount} of ${rows.length} rows calculated.`);
  };

  // ── Save to database ────────────────────────────────────────────────────────
  const handleSave = async () => {
    const doneRecords = records.filter((r) => r.status === "done");
    if (!doneRecords.length) return;
    setSaving(true);

    try {
      for (const r of doneRecords) {
        const modeMap: Record<string, string> = { car: "road", car_ev: "road", flight: "air", train: "rail", bus: "road", truck: "road" };
        await fetch("/api/logistics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: `DIST-${r.place1.substring(0, 3).toUpperCase()}-${r.place2.substring(0, 3).toUpperCase()}`,
            direction: "outbound",
            productDescription: `${r.place1} → ${r.place2}`,
            totalWeightTonnes: 1,
            shipmentDate: new Date().toISOString(),
            legs: [{
              mode: modeMap[r.transport] ?? "road",
              origin: r.place1,
              destination: r.place2,
              distanceKm: r.distanceKm,
              emissionFactor: EMISSION_FACTORS[r.transport]?.factor ?? 0.192,
            }],
          }),
        });
      }
      setSaved(true);
      if (onSaved) onSaved();
    } catch {
      setStatusMsg("Failed to save some records.");
    } finally {
      setSaving(false);
    }
  };

  // ── Download template ────────────────────────────────────────────────────
  const handleTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Place 1", "Place 2", "Transport Type"],
      ["Pretoria", "Krugersdorp", "car"],
      ["Cape Town", "Stellenbosch", "truck"],
      ["Johannesburg", "Durban", "flight"],
      ["Paarl", "Cape Town Port", "truck"],
      ["", "", ""],
    ]);
    ws["!cols"] = [{ wch: 25 }, { wch: 25 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Distance Data");
    XLSX.writeFile(wb, "distance-importer-template.xlsx");
  };

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExport = () => {
    const done = records.filter((r) => r.status === "done");
    const header = ["Place 1", "Place 2", "Transport", "Distance (km)", "CO2 (kg)", "CO2 (t)"].join(",");
    const rows = done.map((r) =>
      [`"${r.place1}"`, `"${r.place2}"`, EMISSION_FACTORS[r.transport]?.label ?? r.transport,
        r.distanceKm?.toFixed(2), r.emissionsKg?.toFixed(3), r.emissionsTonne?.toFixed(6)].join(",")
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `carbon_distances_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const done = records.filter((r) => r.status === "done");
  const totalKm = done.reduce((s, r) => s + (r.distanceKm ?? 0), 0);
  const totalEmissions = done.reduce((s, r) => s + (r.emissionsKg ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}
        className={`rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30"
            : "border-gray-200 dark:border-gray-700 hover:border-emerald-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-emerald-50 dark:bg-emerald-900/40 p-3">
            <Upload className="h-6 w-6 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">Drop your .xlsx file here, or click to browse</p>
          <p className="text-xs text-gray-400">
            Required: <code className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px]">Place 1</code> &middot;{" "}
            <code className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px]">Place 2</code>{" "}
            — Optional: <code className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-[10px]">Transport Type</code>
          </p>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleTemplate(); }}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
          >
            <Download className="h-3 w-3" /> Download Template
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
      </div>

      {/* Status */}
      {statusMsg && (
        <div className={`flex items-center gap-2 text-xs font-medium ${
          statusMsg.startsWith("Could") || statusMsg.startsWith("Failed") ? "text-red-600" : "text-gray-500 dark:text-gray-400"
        }`}>
          {statusMsg.includes("Done") ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> :
           statusMsg.startsWith("Could") || statusMsg.startsWith("Failed") ? <AlertCircle className="h-3.5 w-3.5" /> :
           <Spinner />}
          {statusMsg}
        </div>
      )}

      {records.length > 0 && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
            <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 px-3.5 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Rows</span>
              <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">{records.length}</p>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 px-3.5 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Calculated</span>
              <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">{done.length}</p>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 px-3.5 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total Distance</span>
              <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">{formatNumber(totalKm, 0)} <span className="text-[10px] font-normal text-gray-400">km</span></p>
            </div>
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 px-3.5 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70">Total CO2</span>
              <p className="mt-0.5 text-base font-bold text-emerald-700 dark:text-emerald-400">{formatNumber(totalEmissions / 1000, 3)} <span className="text-[10px] font-normal text-gray-400">tCO2e</span></p>
            </div>
            <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 px-3.5 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Avg Distance</span>
              <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">{done.length ? formatNumber(totalKm / done.length, 0) : 0} <span className="text-[10px] font-normal text-gray-400">km</span></p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleSave} disabled={!done.length || saved || saving}>
              {saving ? <><Spinner /> Saving...</> : saved ? <><CheckCircle2 className="h-4 w-4" /> Saved to database</> : <><FileSpreadsheet className="h-4 w-4" /> Save to database</>}
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={!done.length}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="secondary" onClick={() => { setRecords([]); setStatusMsg(null); setSaved(false); if (fileRef.current) fileRef.current.value = ""; }}>
              <Trash2 className="h-4 w-4" /> Clear
            </Button>
          </div>

          {/* Results Table */}
          <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">From</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">To</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Transport</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Distance</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">CO2</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {records.map((r) => {
                    const ef = EMISSION_FACTORS[r.transport];
                    const sc = STATUS_CONFIG[r.status];
                    return (
                      <tr key={r.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]" title={r.place1}>{r.place1}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                            <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]" title={r.place2}>{r.place2}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                            {ef?.icon}
                            <span className="text-xs">{ef?.label ?? r.transport}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {r.distanceKm ? (
                            <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(r.distanceKm, 1)} <span className="text-[10px] font-normal text-gray-400">km</span></span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          {r.emissionsKg ? (
                            <span className={`font-semibold ${r.emissionsKg > 100 ? "text-red-600" : "text-emerald-700 dark:text-emerald-400"}`}>
                              {formatNumber(r.emissionsKg, 2)} <span className="text-[10px] font-normal text-gray-400">kg</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Emission factors reference */}
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-semibold text-gray-700 dark:text-gray-300">Emission factors</span> (kg CO2/km):{" "}
            {Object.values(EMISSION_FACTORS).map((f) => `${f.label}: ${f.factor}`).join(" · ")}
            {" "}— Source: ICAO / EPA
          </div>
        </>
      )}
    </div>
  );
}
