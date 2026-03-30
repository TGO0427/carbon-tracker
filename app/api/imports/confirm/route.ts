import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

interface ImportEntry {
  siteId: string;
  month: string;
  activityData: number;
  activityUnit: string;
  scope: number;
  sourceName: string;
  sourceCategory: string;
  emissionFactorName: string;
  factor: number;
  units: { unitId: string; pct: number }[];
}

export async function POST(request: Request) {
  const { entries, reportingPeriodId } = await request.json() as {
    entries: ImportEntry[];
    reportingPeriodId: string | null;
  };

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "No entries to import" }, { status: 400 });
  }

  // Look up emission factor IDs
  const factorRecords = await prisma.emissionFactor.findMany();
  const factorIdMap: Record<string, string> = {};
  for (const f of factorRecords) {
    factorIdMap[f.name] = f.id;
  }

  let created = 0;

  for (const entry of entries) {
    const emissionFactorId = factorIdMap[entry.emissionFactorName] ?? null;

    for (const u of entry.units) {
      const activity = Math.round(entry.activityData * u.pct);
      if (activity === 0) continue;

      const totalEmissions = (activity * entry.factor) / 1000;

      await prisma.emissionEntry.create({
        data: {
          scope: entry.scope,
          sourceName: entry.sourceName,
          sourceCategory: entry.sourceCategory,
          activityData: activity,
          activityUnit: entry.activityUnit,
          emissionFactorId,
          totalEmissions,
          entryDate: new Date(`${entry.month}-15`),
          reportingPeriodId: reportingPeriodId || null,
          siteId: entry.siteId,
          unitId: u.unitId,
        },
      });
      created++;
    }
  }

  return NextResponse.json({ success: true, created });
}
