"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScopeBadge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Trash2, ArrowLeft } from "lucide-react";
import type { EmissionFactor } from "@/types";

export default function EmissionFactorsPage() {
  const router = useRouter();
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFactors = () => {
    setLoading(true);
    fetch("/api/emission-factors")
      .then((r) => r.json())
      .then(setFactors)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFactors(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this emission factor?")) return;
    await fetch(`/api/emission-factors/${id}`, { method: "DELETE" });
    fetchFactors();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emission Factors"
        description="UK DEFRA and Eskom (SA Grid) emission factors"
        action={
          <Button variant="outline" onClick={() => router.push("/settings")}>
            <ArrowLeft className="h-4 w-4" /> Back to Settings
          </Button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Scope</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Factor</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Unit</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Source</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((f) => (
                  <tr key={f.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{f.name}</td>
                    <td className="px-4 py-3"><ScopeBadge scope={f.scope} /></td>
                    <td className="px-4 py-3 capitalize text-gray-600">{f.category}</td>
                    <td className="px-4 py-3 text-right font-mono">{f.factor}</td>
                    <td className="px-4 py-3 text-gray-600">{f.unit}</td>
                    <td className="px-4 py-3 text-gray-500">{f.source}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(f.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
