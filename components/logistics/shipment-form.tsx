"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TRANSPORT_MODES } from "@/lib/constants";
import { calculateShipmentEmissions } from "@/lib/calculations";
import { formatNumber } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import type { Shipment, Supplier, ReportingPeriod } from "@/types";

interface LegFormData {
  mode: string;
  origin: string;
  destination: string;
  distanceKm: string;
  emissionFactor: string;
}

interface ShipmentFormProps {
  initialData?: Shipment;
}

export function ShipmentForm({ initialData }: ShipmentFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [saving, setSaving] = useState(false);

  const [direction, setDirection] = useState(initialData?.direction ?? "inbound");
  const [reference, setReference] = useState(initialData?.reference ?? "");
  const [supplierId, setSupplierId] = useState(initialData?.supplierId ?? "");
  const [productDescription, setProductDescription] = useState(initialData?.productDescription ?? "");
  const [totalWeightTonnes, setTotalWeightTonnes] = useState(initialData?.totalWeightTonnes?.toString() ?? "");
  const [shipmentDate, setShipmentDate] = useState(
    initialData?.shipmentDate ? new Date(initialData.shipmentDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [reportingPeriodId, setReportingPeriodId] = useState(initialData?.reportingPeriodId ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [legs, setLegs] = useState<LegFormData[]>(
    initialData?.legs?.map((l) => ({
      mode: l.mode,
      origin: l.origin ?? "",
      destination: l.destination ?? "",
      distanceKm: l.distanceKm.toString(),
      emissionFactor: l.emissionFactor.toString(),
    })) ?? [{ mode: "road", origin: "", destination: "", distanceKm: "", emissionFactor: "0.105" }]
  );

  useEffect(() => {
    fetch("/api/suppliers").then((r) => r.json()).then(setSuppliers).catch(() => {});
    fetch("/api/reporting-periods").then((r) => r.json()).then((data: ReportingPeriod[]) => {
      setPeriods(data);
      if (!initialData) {
        const active = data.find((p) => p.isActive);
        if (active) setReportingPeriodId(active.id);
      }
    }).catch(() => {});
  }, []);

  const addLeg = () => setLegs([...legs, { mode: "road", origin: "", destination: "", distanceKm: "", emissionFactor: "0.105" }]);
  const removeLeg = (i: number) => setLegs(legs.filter((_, idx) => idx !== i));
  const updateLeg = (i: number, field: keyof LegFormData, value: string) => {
    const updated = [...legs];
    updated[i] = { ...updated[i], [field]: value };
    if (field === "mode") {
      const tm = TRANSPORT_MODES.find((m) => m.mode === value);
      if (tm) updated[i].emissionFactor = tm.defaultFactor.toString();
    }
    setLegs(updated);
  };

  const preview = calculateShipmentEmissions(
    parseFloat(totalWeightTonnes) || 0,
    legs.map((l) => ({ distanceKm: parseFloat(l.distanceKm) || 0, emissionFactor: parseFloat(l.emissionFactor) || 0 }))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      direction,
      reference: reference || null,
      supplierId: supplierId || null,
      productDescription: productDescription || null,
      totalWeightTonnes: parseFloat(totalWeightTonnes),
      shipmentDate,
      reportingPeriodId: reportingPeriodId || null,
      notes: notes || null,
      legs: legs.map((l) => ({
        mode: l.mode,
        origin: l.origin || null,
        destination: l.destination || null,
        distanceKm: parseFloat(l.distanceKm) || 0,
        emissionFactor: parseFloat(l.emissionFactor) || 0,
      })),
    };

    const url = isEdit ? `/api/logistics/${initialData.id}` : "/api/logistics";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) router.push("/logistics");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{isEdit ? "Edit Shipment" : "New Shipment"}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              id="direction"
              label="Direction"
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              options={[
                { value: "inbound", label: "Inbound (from supplier)" },
                { value: "outbound", label: "Outbound (to customer)" },
              ]}
            />
            <Input id="reference" label="Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g., SHIP-001" />
            <Select
              id="supplier"
              label="Supplier / Buyer"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              placeholder="Select..."
              options={suppliers.map((s) => ({ value: s.id, label: `${s.name} (${s.type})` }))}
            />
            <Input id="product" label="Product Description" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} />
            <Input id="weight" label="Total Weight (tonnes)" type="number" step="any" value={totalWeightTonnes} onChange={(e) => setTotalWeightTonnes(e.target.value)} />
            <Input id="shipmentDate" label="Shipment Date" type="date" value={shipmentDate} onChange={(e) => setShipmentDate(e.target.value)} />
            <Select
              id="period"
              label="Reporting Period"
              value={reportingPeriodId}
              onChange={(e) => setReportingPeriodId(e.target.value)}
              placeholder="Select..."
              options={periods.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Transport Legs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {legs.map((leg, i) => (
            <div key={i} className="rounded-md border bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500">Leg #{i + 1}</span>
                {legs.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => removeLeg(i)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Select
                  id={`mode-${i}`}
                  label="Mode"
                  value={leg.mode}
                  onChange={(e) => updateLeg(i, "mode", e.target.value)}
                  options={TRANSPORT_MODES.map((m) => ({ value: m.mode, label: m.label }))}
                />
                <Input id={`origin-${i}`} label="Origin" value={leg.origin} onChange={(e) => updateLeg(i, "origin", e.target.value)} />
                <Input id={`dest-${i}`} label="Destination" value={leg.destination} onChange={(e) => updateLeg(i, "destination", e.target.value)} />
                <Input id={`dist-${i}`} label="Distance (km)" type="number" step="any" value={leg.distanceKm} onChange={(e) => updateLeg(i, "distanceKm", e.target.value)} />
              </div>
              {parseFloat(leg.distanceKm) > 0 && parseFloat(totalWeightTonnes) > 0 && (
                <p className="text-sm text-gray-500">
                  = {formatNumber(preview.legEmissions[i] * 1000, 2)} kg CO2e ({formatNumber(preview.legEmissions[i], 4)} tCO2e)
                </p>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addLeg}>
            <Plus className="h-4 w-4" /> Add Leg
          </Button>
        </CardContent>
      </Card>

      {preview.total > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-gray-600">Total Shipment Emissions:</p>
            <p className="text-2xl font-bold text-emerald-600">{formatNumber(preview.total, 4)} tCO2e</p>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : isEdit ? "Update Shipment" : "Create Shipment"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/logistics")}>Cancel</Button>
      </div>
    </form>
  );
}
