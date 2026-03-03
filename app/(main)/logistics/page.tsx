"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Truck, Trash2, Pencil } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { Shipment } from "@/types";

export default function LogisticsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirFilter, setDirFilter] = useState("");

  const fetchShipments = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dirFilter) params.set("direction", dirFilter);
    fetch(`/api/logistics?${params}`)
      .then((r) => r.json())
      .then(setShipments)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchShipments(); }, [dirFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this shipment?")) return;
    await fetch(`/api/logistics/${id}`, { method: "DELETE" });
    fetchShipments();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logistics"
        description="Track inbound and outbound transport emissions"
        action={
          <Link href="/logistics/new">
            <Button><Plus className="h-4 w-4" /> Add Shipment</Button>
          </Link>
        }
      />

      <div className="flex gap-2">
        {["", "inbound", "outbound"].map((d) => (
          <button
            key={d}
            onClick={() => setDirFilter(d)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              dirFilter === d ? "bg-emerald-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {d === "" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : shipments.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Truck className="h-12 w-12" />}
            title="No shipments yet"
            description="Track your transport emissions by adding shipments."
            action={
              <Link href="/logistics/new">
                <Button><Plus className="h-4 w-4" /> Add Shipment</Button>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Direction</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Supplier</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Weight (t)</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Legs</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Emissions (tCO2e)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.reference ?? "-"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.direction === "inbound" ? "inbound" : "outbound"}>
                        {s.direction}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.supplier?.name ?? "-"}</td>
                    <td className="px-4 py-3 text-right">{formatNumber(s.totalWeightTonnes)}</td>
                    <td className="px-4 py-3 text-center">{s.legs?.length ?? 0}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatNumber(s.totalEmissions, 4)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link href={`/logistics/${s.id}`}>
                          <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
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
    </div>
  );
}
