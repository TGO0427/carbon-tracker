"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScopeBadge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Trash2, Plus, Check } from "lucide-react";
import type { ReportingPeriod } from "@/types";

export default function SettingsPage() {
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPeriod, setShowNewPeriod] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const fetchPeriods = () => {
    setLoading(true);
    fetch("/api/reporting-periods")
      .then((r) => r.json())
      .then(setPeriods)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPeriods(); }, []);

  const handleCreatePeriod = async () => {
    if (!newName || !newStart || !newEnd) return;
    await fetch("/api/reporting-periods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, startDate: newStart, endDate: newEnd }),
    });
    setShowNewPeriod(false);
    setNewName("");
    setNewStart("");
    setNewEnd("");
    fetchPeriods();
  };

  const handleSetActive = async (id: string) => {
    await fetch(`/api/reporting-periods/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    fetchPeriods();
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm("Delete this reporting period?")) return;
    await fetch(`/api/reporting-periods/${id}`, { method: "DELETE" });
    fetchPeriods();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reporting Periods</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowNewPeriod(!showNewPeriod)}>
              <Plus className="h-4 w-4" /> Add Period
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showNewPeriod && (
            <div className="mb-4 flex items-end gap-3 rounded-md border bg-gray-50 p-3">
              <Input id="newName" label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="FY 2025-2026" />
              <Input id="newStart" label="Start Date" type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              <Input id="newEnd" label="End Date" type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              <Button size="sm" onClick={handleCreatePeriod}>Save</Button>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Name</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Start</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">End</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-500">Active</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-gray-600">{new Date(p.startDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-gray-600">{new Date(p.endDate).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-center">
                      {p.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600"><Check className="h-4 w-4" /> Active</span>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleSetActive(p.id)}>Set Active</Button>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDeletePeriod(p.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Emission Factors</CardTitle>
            <Link href="/settings/emission-factors">
              <Button size="sm" variant="outline">Manage Factors</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            View and manage emission factors used for calculations. Pre-loaded with UK DEFRA and Eskom (SA Grid) factors.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
