import { prisma } from "@/lib/db";
import { buildDateFilter } from "@/lib/api-date-filter";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const where = buildDateFilter(request, "entryDate");
  const emissions = await prisma.emissionEntry.findMany({ where });

  const bySource: Record<string, { sourceName: string; scope: number; total: number }> = {};
  for (const e of emissions) {
    if (!bySource[e.sourceName]) {
      bySource[e.sourceName] = { sourceName: e.sourceName, scope: e.scope, total: 0 };
    }
    bySource[e.sourceName].total += e.totalEmissions;
  }

  const data = Object.values(bySource).sort((a, b) => b.total - a.total);
  return NextResponse.json(data);
}
