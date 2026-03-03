"use client";

import { useEffect, useRef, useState } from "react";
import { PrintButton } from "@/components/ui/print-button";
import { useDateFilter } from "@/lib/date-filter-context";
import { ACTIVITY_BAR_COLORS } from "@/lib/constants";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { SupplierEmissions } from "@/types";

export function SectorComparisonTab() {
  const [data, setData] = useState<SupplierEmissions[]>([]);
  const { buildQuery } = useDateFilter();
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = buildQuery();
    fetch(`/api/dashboard/supplier-emissions?${q}`).then((r) => r.json()).then(setData).catch(() => {});
  }, [buildQuery]);

  return (
    <div ref={chartRef} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Supplier Emissions</h3>
          <p className="text-sm text-gray-400">Total logistics emissions per supplier/buyer</p>
        </div>
        <PrintButton chartRef={chartRef} title="Supplier Emissions" />
      </div>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 12, fill: "#9ca3af" }} />
            <YAxis dataKey="supplierName" type="category" width={160} tick={{ fontSize: 12, fill: "#6b7280" }} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(value) => `${Number(value).toFixed(2)} tCO2e`}
              labelFormatter={(label) => {
                const item = data.find((d) => d.supplierName === label);
                return `${label} (${item?.supplierType ?? ""}, ${item?.shipmentCount ?? 0} shipments)`;
              }}
            />
            <Bar dataKey="totalEmissions" radius={[0, 4, 4, 0]}>
              {data.map((_entry, i) => (
                <Cell key={i} fill={ACTIVITY_BAR_COLORS[i % ACTIVITY_BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
          No supplier emission data available.
        </div>
      )}
    </div>
  );
}
