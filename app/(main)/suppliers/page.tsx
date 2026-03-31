"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-4">
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
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
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
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Name</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Country</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">City</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Shipments</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Emissions (tCO2e)</th>
                  <th className="w-24 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {suppliers.map((s) => {
                  const em = getEmissions(s.id);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">{s.name}</td>
                      <td className="px-4 py-3.5">
                        <Badge>{s.type}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{s.country ?? "-"}</td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{s.city ?? "-"}</td>
                      <td className="px-4 py-3.5 text-center text-gray-600 dark:text-gray-300">{s._count?.shipments ?? 0}</td>
                      <td className="px-4 py-3.5 text-right">
                        {em > 0 ? (
                          <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(em, 2)}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end">
                          <div className="inline-flex rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden opacity-60 hover:opacity-100 transition-opacity">
                            <Link href={`/suppliers/${s.id}`}>
                              <button className="px-2 py-1.5 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-emerald-600 transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </Link>
                            <div className="w-px bg-gray-100 dark:bg-gray-700" />
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="px-2 py-1.5 text-gray-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
