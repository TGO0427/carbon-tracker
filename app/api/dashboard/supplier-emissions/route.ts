import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const dateFilter: Record<string, unknown> = {};
  if (year) {
    const y = Number(year);
    const startDate = new Date(y, month ? Number(month) - 1 : 0, 1);
    const endDate = month
      ? new Date(y, Number(month), 0, 23, 59, 59)
      : new Date(y, 11, 31, 23, 59, 59);
    dateFilter.shipmentDate = { gte: startDate, lte: endDate };
  }

  const suppliers = await prisma.supplier.findMany({
    include: {
      shipments: {
        where: dateFilter,
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
