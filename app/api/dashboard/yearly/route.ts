import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const siteId = searchParams.get("siteId");

  const siteFilter = siteId ? { siteId } : {};

  const emissions = await prisma.emissionEntry.findMany({ where: siteFilter });
  const shipments = await prisma.shipment.findMany({ where: siteFilter });

  const yearly: Record<number, { scope1: number; scope2: number; scope3: number }> = {};

  for (const e of emissions) {
    const year = new Date(e.entryDate).getFullYear();
    if (!yearly[year]) yearly[year] = { scope1: 0, scope2: 0, scope3: 0 };
    if (e.scope === 1) yearly[year].scope1 += e.totalEmissions;
    else if (e.scope === 2) yearly[year].scope2 += e.totalEmissions;
    else yearly[year].scope3 += e.totalEmissions;
  }

  for (const sh of shipments) {
    const year = new Date(sh.shipmentDate).getFullYear();
    if (!yearly[year]) yearly[year] = { scope1: 0, scope2: 0, scope3: 0 };
    yearly[year].scope3 += sh.totalEmissions;
  }

  const data = Object.entries(yearly)
    .map(([year, vals]) => ({
      year: Number(year),
      ...vals,
      total: vals.scope1 + vals.scope2 + vals.scope3,
    }))
    .sort((a, b) => a.year - b.year);

  return NextResponse.json(data);
}
