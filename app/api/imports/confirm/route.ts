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
  const { entries, reportingPeriodId, skipDuplicates = false } = await request.json() as {
    entries: ImportEntry[];
    reportingPeriodId: string | null;
    skipDuplicates?: boolean;
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
  let duplicates = 0;

  for (const entry of entries) {
    const emissionFactorId = factorIdMap[entry.emissionFactorName] ?? null;

    // Check for existing entries with same sourceName, siteId, and month
    const entryDate = new Date(`${entry.month}-15`);
    const monthStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), 1);
    const monthEnd = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 1);

    const existingCount = await prisma.emissionEntry.count({
      where: {
        sourceName: entry.sourceName,
        siteId: entry.siteId,
        entryDate: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    });

    if (existingCount > 0) {
      duplicates++;
      if (!skipDuplicates) {
        continue;
      }
    }

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

  // Create audit log entry for the import
  if (created > 0) {
    await prisma.auditLog.create({
      data: {
        action: "import",
        entity: "emission",
        count: created,
        details: `Imported ${created} emission entries${duplicates > 0 ? ` (${duplicates} duplicates skipped)` : ""}`,
        userName: "Admin",
      },
    });
  }

  return NextResponse.json({ success: true, created, duplicates });
}
