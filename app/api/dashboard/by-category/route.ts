import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const periodId = searchParams.get("periodId");

  const where: Record<string, unknown> = {};
  if (periodId) where.reportingPeriodId = periodId;
  if (year) {
    const y = Number(year);
    const startDate = new Date(y, month ? Number(month) - 1 : 0, 1);
    const endDate = month
      ? new Date(y, Number(month), 0, 23, 59, 59)
      : new Date(y, 11, 31, 23, 59, 59);
    where.entryDate = { gte: startDate, lte: endDate };
  }

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
