"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { calculateEmission, calculateShipmentEmissions } from "@/lib/calculations";
import { TRANSPORT_MODES } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type { EmissionFactor } from "@/types";

interface LegInput {
  mode: string;
  distanceKm: string;
  emissionFactor: string;
}

export default function CalculatorPage() {
  const [tab, setTab] = useState<"general" | "transport">("general");
  const [factors, setFactors] = useState<EmissionFactor[]>([]);

  // General calculator
  const [selectedFactorId, setSelectedFactorId] = useState("");
  const [activityData, setActivityData] = useState("");

  // Transport calculator
  const [weight, setWeight] = useState("");
  const [legs, setLegs] = useState<LegInput[]>([
    { mode: "road", distanceKm: "", emissionFactor: "0.105" },
  ]);

  useEffect(() => {
    fetch("/api/emission-factors").then((r) => r.json()).then(setFactors).catch(() => {});
  }, []);

  const selectedFactor = factors.find((f) => f.id === selectedFactorId);
  const generalResult = selectedFactor
    ? calculateEmission(parseFloat(activityData) || 0, selectedFactor.factor)
    : 0;

  const transportResult = calculateShipmentEmissions(
    parseFloat(weight) || 0,
    legs.map((l) => ({
      distanceKm: parseFloat(l.distanceKm) || 0,
      emissionFactor: parseFloat(l.emissionFactor) || 0,
    }))
  );

  const addLeg = () => setLegs([...legs, { mode: "road", distanceKm: "", emissionFactor: "0.105" }]);
  const removeLeg = (i: number) => setLegs(legs.filter((_, idx) => idx !== i));
  const updateLeg = (i: number, field: keyof LegInput, value: string) => {
    const updated = [...legs];
    updated[i] = { ...updated[i], [field]: value };
    if (field === "mode") {
      const tm = TRANSPORT_MODES.find((m) => m.mode === value);
      if (tm) updated[i].emissionFactor = tm.defaultFactor.toString();
    }
    setLegs(updated);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Emissions Calculator" description="Quick what-if calculations without saving" />

      <div className="flex gap-2">
        <button
          onClick={() => setTab("general")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "general" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          General Calculator
        </button>
        <button
          onClick={() => setTab("transport")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "transport" ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Transport Calculator
        </button>
      </div>

      {tab === "general" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Calculate Emissions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select
                id="factor"
                label="Emission Source"
                value={selectedFactorId}
                onChange={(e) => setSelectedFactorId(e.target.value)}
                placeholder="Select a source..."
                options={factors.map((f) => ({
                  value: f.id,
                  label: `${f.name} (${f.factor} ${f.unit})`,
                }))}
              />
              <Input
                id="activityData"
                label={`Activity Data${selectedFactor ? ` (${selectedFactor.unit.split("/")[1] ?? ""})` : ""}`}
                type="number"
                step="any"
                value={activityData}
                onChange={(e) => setActivityData(e.target.value)}
                placeholder="Enter quantity"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Result</CardTitle></CardHeader>
            <CardContent>
              {parseFloat(activityData) > 0 && selectedFactor ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    {formatNumber(parseFloat(activityData))} &times; {selectedFactor.factor} {selectedFactor.unit}
                  </p>
                  <p className="text-3xl font-bold text-emerald-600">{formatNumber(generalResult, 4)} tCO2e</p>
                  <p className="text-sm text-gray-500">= {formatNumber(generalResult * 1000, 2)} kg CO2e</p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Select a source and enter activity data to calculate.</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Multi-Modal Transport Calculator</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input
                id="weight"
                label="Shipment Weight (tonnes)"
                type="number"
                step="any"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g., 10"
              />

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Transport Legs</p>
                {legs.map((leg, i) => (
                  <div key={i} className="flex items-end gap-3 rounded-md border bg-gray-50 p-3">
                    <span className="mb-2 text-sm font-bold text-gray-400">#{i + 1}</span>
                    <Select
                      id={`mode-${i}`}
                      label="Mode"
                      value={leg.mode}
                      onChange={(e) => updateLeg(i, "mode", e.target.value)}
                      options={TRANSPORT_MODES.map((m) => ({ value: m.mode, label: m.label }))}
                    />
                    <Input
                      id={`dist-${i}`}
                      label="Distance (km)"
                      type="number"
                      step="any"
                      value={leg.distanceKm}
                      onChange={(e) => updateLeg(i, "distanceKm", e.target.value)}
                    />
                    <Input
                      id={`factor-${i}`}
                      label="Factor"
                      type="number"
                      step="any"
                      value={leg.emissionFactor}
                      onChange={(e) => updateLeg(i, "emissionFactor", e.target.value)}
                    />
                    {legs.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() => removeLeg(i)} className="mb-1">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={addLeg}>
                  <Plus className="h-4 w-4" /> Add Leg
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Result</CardTitle></CardHeader>
            <CardContent>
              {parseFloat(weight) > 0 && legs.some((l) => parseFloat(l.distanceKm) > 0) ? (
                <div className="space-y-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Leg</th>
                        <th className="py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Mode</th>
                        <th className="py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Distance</th>
                        <th className="py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Emissions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {legs.map((leg, i) => (
                        <tr key={i} className="border-b">
                          <td className="py-2">#{i + 1}</td>
                          <td className="py-2">{TRANSPORT_MODES.find((m) => m.mode === leg.mode)?.label ?? leg.mode}</td>
                          <td className="py-2 text-right">{formatNumber(parseFloat(leg.distanceKm) || 0, 0)} km</td>
                          <td className="py-2 text-right font-medium">
                            {formatNumber(transportResult.legEmissions[i] * 1000, 2)} kg CO2e
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="border-t pt-3">
                    <p className="text-3xl font-bold text-emerald-600">
                      {formatNumber(transportResult.total, 4)} tCO2e
                    </p>
                    <p className="text-sm text-gray-500">
                      = {formatNumber(transportResult.total * 1000, 2)} kg CO2e
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Enter weight and at least one leg distance to calculate.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
