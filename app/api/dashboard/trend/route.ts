import { prisma } from "@/lib/db";
import { buildDateFilter } from "@/lib/api-date-filter";
import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

export async function GET(request: NextRequest) {
  const where = buildDateFilter(request, "entryDate");
  const emissions = await prisma.emissionEntry.findMany({ where });

  const monthly: Record<string, { scope1: number; scope2: number; scope3: number }> = {};

  for (const e of emissions) {
    const month = format(new Date(e.entryDate), "yyyy-MM");
    if (!monthly[month]) monthly[month] = { scope1: 0, scope2: 0, scope3: 0 };
    if (e.scope === 1) monthly[month].scope1 += e.totalEmissions;
    else if (e.scope === 2) monthly[month].scope2 += e.totalEmissions;
    else monthly[month].scope3 += e.totalEmissions;
  }

  const data = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({
      month,
      ...vals,
      total: vals.scope1 + vals.scope2 + vals.scope3,
    }));

  return NextResponse.json(data);
}
