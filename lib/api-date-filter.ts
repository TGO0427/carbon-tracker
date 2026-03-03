import { NextRequest } from "next/server";

export function buildDateFilter(request: NextRequest, dateField: "entryDate" | "shipmentDate" = "entryDate") {
  const { searchParams } = request.nextUrl;
  const periodId = searchParams.get("periodId");
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const where: Record<string, unknown> = {};
  if (periodId) {
    where.reportingPeriodId = periodId;
  } else if (year) {
    const y = Number(year);
    const startDate = new Date(y, month ? Number(month) - 1 : 0, 1);
    const endDate = month
      ? new Date(y, Number(month), 0, 23, 59, 59)
      : new Date(y, 11, 31, 23, 59, 59);
    where[dateField] = { gte: startDate, lte: endDate };
  }

  return where;
}
