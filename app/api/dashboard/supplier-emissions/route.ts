import { prisma } from "@/lib/db";
import { buildDateFilter } from "@/lib/api-date-filter";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const shipmentWhere = buildDateFilter(request, "shipmentDate");

  const suppliers = await prisma.supplier.findMany({
    include: {
      shipments: {
        where: shipmentWhere,
        select: { totalEmissions: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const data = suppliers
    .map((s) => ({
      supplierId: s.id,
      supplierName: s.name,
      supplierType: s.type,
      totalEmissions: s.shipments.reduce((sum: number, sh: { totalEmissions: number }) => sum + sh.totalEmissions, 0),
      shipmentCount: s.shipments.length,
    }))
    .filter((s) => s.totalEmissions > 0)
    .sort((a, b) => b.totalEmissions - a.totalEmissions);

  return NextResponse.json(data);
}
