"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Users, Trash2, Pencil, Truck, Package, Activity, MapPin } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import type { Supplier, SupplierEmissions } from "@/types";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [emissions, setEmissions] = useState<SupplierEmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");

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

  const getShipmentCount = (supplierId: string) => {
    return emissions.find((e) => e.supplierId === supplierId)?.shipmentCount ?? 0;
  };

  // Filtered list
  const filtered = typeFilter
    ? suppliers.filter((s) => s.type === typeFilter)
    : suppliers;

  // Stats
  const supplierCount = suppliers.filter((s) => s.type === "supplier").length;
  const buyerCount = suppliers.filter((s) => s.type === "buyer").length;
  const totalShipments = emissions.reduce((s, e) => s + e.shipmentCount, 0);
  const totalEm = emissions.reduce((s, e) => s + e.totalEmissions, 0);
  const activePartners = emissions.filter((e) => e.shipmentCount > 0).length;

  // Initial color from name
  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const initialColors: Record<string, string> = {
    supplier: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    buyer: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers & Buyers"
        description="Manage supply chain partners and track logistics emissions"
        action={
          <Link href="/suppliers/new">
            <Button><Plus className="h-4 w-4" /> Add Supplier</Button>
          </Link>
        }
      />

      {/* KPI Strip */}
      {!loading && suppliers.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70">Total</span>
            </div>
            <p className="mt-0.5 text-lg font-bold text-gray-900 dark:text-white">{suppliers.length}</p>
          </div>
          <div className="rounded-lg border border-blue-100/70 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/15 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Suppliers</span>
            </div>
            <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">{supplierCount}</p>
          </div>
          <div className="rounded-lg border border-amber-100/70 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/15 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Buyers</span>
            </div>
            <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">{buyerCount}</p>
          </div>
          <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Shipments</span>
            </div>
            <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">{totalShipments}</p>
          </div>
          <div className="rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Emissions</span>
            </div>
            <p className="mt-0.5 text-base font-bold text-gray-900 dark:text-white">{formatNumber(totalEm)} <span className="text-[10px] font-normal text-gray-400">tCO2e</span></p>
          </div>
        </div>
      )}

      {/* Filter pills */}
      {!loading && suppliers.length > 0 && (
        <div className="flex items-center gap-2">
          {[
            { value: "", label: "All" },
            { value: "supplier", label: "Suppliers" },
            { value: "buyer", label: "Buyers" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                typeFilter === f.value
                  ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700/20"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 hover:text-emerald-700"
              }`}
            >
              {f.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">{filtered.length} {filtered.length === 1 ? "partner" : "partners"}</span>
        </div>
      )}

      {/* Table */}
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
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Partner</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Location</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Shipments</th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Emissions</th>
                  <th className="w-24 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filtered.map((s) => {
                  const em = getEmissions(s.id);
                  const shipments = getShipmentCount(s.id);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${initialColors[s.type] ?? "bg-gray-100 text-gray-600"}`}>
                            {getInitials(s.name)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                            {s.notes && <p className="text-[10px] text-gray-400/70 dark:text-gray-500 truncate max-w-[200px]">{s.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge>{s.type}</Badge>
                      </td>
                      <td className="px-4 py-3.5">
                        {s.country ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300">{s.city ? `${s.city}, ` : ""}{s.country}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {shipments > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">{shipments}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {em > 0 ? (
                          <span className="font-semibold text-gray-900 dark:text-white">{formatNumber(em, 2)}<span className="ml-0.5 text-[10px] font-normal text-gray-300 dark:text-gray-500">t</span></span>
                        ) : (
                          <span className="text-gray-400">-</span>
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
