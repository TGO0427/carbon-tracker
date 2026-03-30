import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

interface CheckEntry {
  siteId: string;
  month: string;
  sourceName: string;
  facility: string;
}

export async function POST(request: Request) {
  const { entries } = await request.json() as { entries: CheckEntry[] };

  if (!entries || entries.length === 0) {
    return NextResponse.json({ duplicates: [] });
  }

  // Build unique combinations of sourceName + siteId + month
  const seen = new Set<string>();
  const checks: { sourceName: string; siteId: string; month: string; facility: string }[] = [];

  for (const entry of entries) {
    const key = `${entry.sourceName}|${entry.siteId}|${entry.month}`;
    if (!seen.has(key)) {
      seen.add(key);
      checks.push({
        sourceName: entry.sourceName,
        siteId: entry.siteId,
        month: entry.month,
        facility: entry.facility,
      });
    }
  }

  const duplicates: { facility: string; month: string; sourceName: string; existing: number }[] = [];

  for (const check of checks) {
    const entryDate = new Date(`${check.month}-15`);
    const monthStart = new Date(entryDate.getFullYear(), entryDate.getMonth(), 1);
    const monthEnd = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 1);

    const existing = await prisma.emissionEntry.count({
      where: {
        sourceName: check.sourceName,
        siteId: check.siteId,
        entryDate: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    });

    if (existing > 0) {
      duplicates.push({
        facility: check.facility,
        month: check.month,
        sourceName: check.sourceName,
        existing,
      });
    }
  }

  return NextResponse.json({ duplicates });
}
