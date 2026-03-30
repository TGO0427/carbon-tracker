import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface MissingDataItem {
  facility: string;
  siteId: string;
  siteName: string;
  sourceName: string;
  sourceCategory: string;
  month: string;
  scope: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = Number(searchParams.get("year") || new Date().getFullYear());

  // Get all units grouped by facility (unit.name)
  const units = await prisma.unit.findMany({ include: { site: true } });
  const facilityMap: Record<string, { siteId: string; siteName: string }> = {};
  for (const u of units) {
    if (!facilityMap[u.name]) {
      facilityMap[u.name] = { siteId: u.siteId, siteName: u.site.name };
    }
  }

  // Define what each facility should be reporting
  const expectedData: { facility: string; sourceName: string; sourceCategory: string; scope: number; maxMonth: number }[] = [
    // Electricity - all facilities, 12 months
    { facility: "Impilo", sourceName: "Purchased Electricity", sourceCategory: "energy", scope: 2, maxMonth: 12 },
    { facility: "Sizwe", sourceName: "Purchased Electricity", sourceCategory: "energy", scope: 2, maxMonth: 12 },
    { facility: "ISO Foods", sourceName: "Purchased Electricity", sourceCategory: "energy", scope: 2, maxMonth: 12 },
    { facility: "Allmark", sourceName: "Purchased Electricity", sourceCategory: "energy", scope: 2, maxMonth: 12 },
    // Water - Dec typically lags
    { facility: "Impilo", sourceName: "Water Supply", sourceCategory: "water", scope: 3, maxMonth: 12 },
    { facility: "Sizwe", sourceName: "Water Supply", sourceCategory: "water", scope: 3, maxMonth: 12 },
    { facility: "ISO Foods", sourceName: "Water Supply", sourceCategory: "water", scope: 3, maxMonth: 12 },
    { facility: "Allmark", sourceName: "Water Supply", sourceCategory: "water", scope: 3, maxMonth: 12 },
    // LPG
    { facility: "Impilo", sourceName: "LPG (Oven)", sourceCategory: "fuel", scope: 1, maxMonth: 12 },
    { facility: "Sizwe", sourceName: "LPG (Boiler)", sourceCategory: "fuel", scope: 1, maxMonth: 12 },
    // Diesel
    { facility: "ISO Foods", sourceName: "Diesel (Fleet)", sourceCategory: "fuel", scope: 1, maxMonth: 12 },
  ];

  // Get all emissions for this year
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);
  const emissions = await prisma.emissionEntry.findMany({
    where: { entryDate: { gte: startDate, lte: endDate } },
    include: { unit: true },
  });

  // Build a set of existing facility+source+month combos
  const existingSet = new Set<string>();
  for (const e of emissions) {
    const facilityName = e.unit?.name ?? "Site-wide";
    const month = `${year}-${String(new Date(e.entryDate).getMonth() + 1).padStart(2, "0")}`;
    existingSet.add(`${facilityName}|${e.sourceName}|${month}`);
  }

  // Find gaps
  const missing: MissingDataItem[] = [];
  const currentMonth = new Date().getFullYear() === year
    ? new Date().getMonth() + 1
    : 12;

  for (const exp of expectedData) {
    const info = facilityMap[exp.facility];
    if (!info) continue;

    const checkUpTo = Math.min(exp.maxMonth, currentMonth);
    for (let m = 1; m <= checkUpTo; m++) {
      const month = `${year}-${String(m).padStart(2, "0")}`;
      const key = `${exp.facility}|${exp.sourceName}|${month}`;
      if (!existingSet.has(key)) {
        missing.push({
          facility: exp.facility,
          siteId: info.siteId,
          siteName: info.siteName,
          sourceName: exp.sourceName,
          sourceCategory: exp.sourceCategory,
          month,
          scope: exp.scope,
        });
      }
    }
  }

  // Sort by month desc, then facility
  missing.sort((a, b) => b.month.localeCompare(a.month) || a.facility.localeCompare(b.facility));

  return NextResponse.json({
    year,
    totalExpected: expectedData.reduce((s, e) => s + Math.min(e.maxMonth, currentMonth), 0),
    totalPresent: expectedData.reduce((s, e) => s + Math.min(e.maxMonth, currentMonth), 0) - missing.length,
    missingCount: missing.length,
    missing,
  });
}
