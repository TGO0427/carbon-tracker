"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Download, FileSpreadsheet } from "lucide-react";
import type { ReportingPeriod } from "@/types";

export default function ReportsPage() {
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [periodId, setPeriodId] = useState("");
  const [scopes, setScopes] = useState([1, 2, 3]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/reporting-periods").then((r) => r.json()).then((data: ReportingPeriod[]) => {
      setPeriods(data);
      const active = data.find((p) => p.isActive);
      if (active) setPeriodId(active.id);
    }).catch(() => {});
  }, []);

  const toggleScope = (scope: number) => {
    setScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId: periodId || null, scopes, format: "xlsx" }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `carbon-report.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Export your carbon footprint data" />

      <Card>
        <CardHeader><CardTitle>Report Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select
            id="period"
            label="Reporting Period"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
            placeholder="All periods"
            options={periods.map((p) => ({ value: p.id, label: p.name }))}
          />

          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Include Scopes</p>
            <div className="flex gap-3">
              {[1, 2, 3].map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="rounded"
                  />
                  Scope {scope}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={handleExport} disabled={exporting || scopes.length === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              {exporting ? "Generating..." : "Download Excel Report"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>What&apos;s Included</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2"><Download className="h-4 w-4 text-emerald-600" /> Summary sheet with emissions by scope and percentages</li>
            <li className="flex items-center gap-2"><Download className="h-4 w-4 text-emerald-600" /> Detailed emissions breakdown by source with activity data and factors</li>
            <li className="flex items-center gap-2"><Download className="h-4 w-4 text-emerald-600" /> Logistics sheet with shipment details (if Scope 3 included)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
