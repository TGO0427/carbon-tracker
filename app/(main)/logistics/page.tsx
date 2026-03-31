"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Truck, Trash2, Pencil, MapPin } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import { DistanceImporter } from "@/components/calculator/distance-importer";
import type { Shipment } from "@/types";

export default function LogisticsPage() {
  const [tab, setTab] = useState<"shipments" | "importer">("shipments");
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
    <div className="space-y-4">
      <PageHeader
        title="Logistics"
        description="Track inbound and outbound transport emissions"
        action={
          <Link href="/logistics/new">
            <Button><Plus className="h-4 w-4" /> Add Shipment</Button>
          </Link>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab("shipments")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            tab === "shipments"
              ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700/20"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 hover:text-emerald-700"
          }`}
        >
          <span className="flex items-center gap-1.5"><Truck className="h-3 w-3" /> Shipments</span>
        </button>
        <button
          onClick={() => setTab("importer")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
            tab === "importer"
              ? "bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-700/20"
              : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300 hover:text-emerald-700"
          }`}
        >
          <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Distance Importer</span>
        </button>
      </div>

      {tab === "importer" ? (
        <DistanceImporter onSaved={() => { setTab("shipments"); fetchShipments(); }} />
      ) : (
        <>
          {/* Direction filters */}
          <div className="flex items-center gap-2">
            {["", "inbound", "outbound"].map((d) => (
              <button
                key={d}
                onClick={() => setDirFilter(d)}
                className={`rounded-full px-3.5 py-1 text-[11px] font-medium transition-all ${
                  dirFilter === d
                    ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {d === "" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
            {shipments.length > 0 && (
              <span className="ml-auto text-xs text-gray-400">
                {shipments.length} {shipments.length === 1 ? "shipment" : "shipments"}
              </span>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : shipments.length === 0 ? (
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
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
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700">
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Reference</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Direction</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Supplier</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Weight</th>
                      <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Legs</th>
                      <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">tCO2e</th>
                      <th className="w-24 px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {shipments.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3.5 font-medium text-gray-900 dark:text-white">{s.reference ?? "-"}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant={s.direction === "inbound" ? "inbound" : "outbound"}>
                            {s.direction}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">{s.supplier?.name ?? "-"}</td>
                        <td className="px-4 py-3.5 text-right text-gray-600 dark:text-gray-300">{formatNumber(s.totalWeightTonnes)} <span className="text-[10px] text-gray-400">t</span></td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">{s.legs?.length ?? 0}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-semibold text-gray-900 dark:text-white">{formatNumber(s.totalEmissions, 4)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex justify-end">
                            <div className="inline-flex rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden opacity-60 hover:opacity-100 transition-opacity">
                              <Link href={`/logistics/${s.id}`}>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
