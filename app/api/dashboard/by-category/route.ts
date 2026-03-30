import { prisma } from "@/lib/db";
import { buildDateFilter } from "@/lib/api-date-filter";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const where = buildDateFilter(request, "entryDate");
  const emissions = await prisma.emissionEntry.findMany({ where });

  const byCategory: Record<string, { category: string; scope: number; total: number }> = {};
  for (const e of emissions) {
    const key = `${e.sourceCategory}-${e.scope}`;
    if (!byCategory[key]) {
      byCategory[key] = { category: e.sourceCategory, scope: e.scope, total: 0 };
    }
    byCategory[key].total += e.totalEmissions;
  }

  const data = Object.values(byCategory).sort((a, b) => b.total - a.total);
  return NextResponse.json(data);
}
