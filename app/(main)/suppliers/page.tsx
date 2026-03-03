"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Users, Trash2, Pencil } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { Supplier, SupplierEmissions } from "@/types";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [emissions, setEmissions] = useState<SupplierEmissions[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuppliers = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/suppliers").then((r) => r.json()),
      fetch("/api/dashboard/supplier-emissions").then((r) => r.json()),
    ])
      .then(([supData, emData]) => {
        setSuppliers(supData);
        setEmissions(emData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSuppliers(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
    fetchSuppliers();
  };

  const getEmissions = (supplierId: string) => {
    return emissions.find((e) => e.supplierId === supplierId)?.totalEmissions ?? 0;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers & Buyers"
        action={
          <Link href="/suppliers/new">
            <Button><Plus className="h-4 w-4" /> Add Supplier</Button>
          </Link>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : suppliers.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title="No suppliers yet"
            description="Add suppliers and buyers to link them to shipments."
            action={
              <Link href="/suppliers/new">
                <Button><Plus className="h-4 w-4" /> Add Supplier</Button>
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
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Country</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">City</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Shipments</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Emissions (tCO2e)</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => {
                  const em = getEmissions(s.id);
                  return (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3">
                        <Badge>{s.type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{s.country ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{s.city ?? "-"}</td>
                      <td className="px-4 py-3 text-center">{s._count?.shipments ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        {em > 0 ? (
                          <span className="font-medium text-gray-900">{formatNumber(em, 2)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/suppliers/${s.id}`}>
                            <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /></Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
