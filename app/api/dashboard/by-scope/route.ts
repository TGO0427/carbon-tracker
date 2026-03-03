import { prisma } from "@/lib/db";
import { buildDateFilter } from "@/lib/api-date-filter";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const emissionWhere = buildDateFilter(request, "entryDate");
  const shipmentWhere = buildDateFilter(request, "shipmentDate");

  const emissions = await prisma.emissionEntry.findMany({ where: emissionWhere });
  const shipments = await prisma.shipment.findMany({ where: shipmentWhere });

  const scope1 = emissions.filter((e) => e.scope === 1).reduce((s, e) => s + e.totalEmissions, 0);
  const scope2 = emissions.filter((e) => e.scope === 2).reduce((s, e) => s + e.totalEmissions, 0);
  const scope3 = emissions.filter((e) => e.scope === 3).reduce((s, e) => s + e.totalEmissions, 0) +
    shipments.reduce((s, sh) => s + sh.totalEmissions, 0);
  const total = scope1 + scope2 + scope3;

  const data = [
    { scope: 1, label: "Scope 1", total: scope1, percentage: total > 0 ? (scope1 / total) * 100 : 0 },
    { scope: 2, label: "Scope 2", total: scope2, percentage: total > 0 ? (scope2 / total) * 100 : 0 },
    { scope: 3, label: "Scope 3", total: scope3, percentage: total > 0 ? (scope3 / total) * 100 : 0 },
  ];

  return NextResponse.json(data);
}
