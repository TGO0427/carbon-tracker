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
  const scope3Entries = emissions.filter((e) => e.scope === 3).reduce((s, e) => s + e.totalEmissions, 0);
  const scope3Logistics = shipments.reduce((s, sh) => s + sh.totalEmissions, 0);
  const scope3 = scope3Entries + scope3Logistics;
  const total = scope1 + scope2 + scope3;

  return NextResponse.json({
    total,
    scope1,
    scope2,
    scope3,
    entryCount: emissions.length + shipments.length,
  });
}
