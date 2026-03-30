import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

interface ValidationAlert {
  id: string;
  severity: "warning" | "critical";
  type: string;
  message: string;
  facility: string;
  month: string;
  value: number;
  expected: number;
  deviation: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = Number(searchParams.get("year") || new Date().getFullYear());

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const emissions = await prisma.emissionEntry.findMany({
    where: { entryDate: { gte: startDate, lte: endDate } },
    include: { unit: true },
  });

  // Group by facility + source to calculate averages
  const groups: Record<string, { values: { month: number; total: number; id: string }[] }> = {};

  for (const e of emissions) {
    const facility = e.unit?.name ?? "Site-wide";
    const key = `${facility}|${e.sourceName}`;
    if (!groups[key]) groups[key] = { values: [] };

    const month = new Date(e.entryDate).getMonth() + 1;
    // Aggregate by month within the group
    const existing = groups[key].values.find((v) => v.month === month);
    if (existing) {
      existing.total += e.activityData;
    } else {
      groups[key].values.push({ month, total: e.activityData, id: e.id });
    }
  }

  const alerts: ValidationAlert[] = [];

  for (const [key, group] of Object.entries(groups)) {
    const [facility, sourceName] = key.split("|");
    const values = group.values;
    if (values.length < 3) continue; // Need at least 3 months to detect outliers

    const nums = values.map((v) => v.total);
    const mean = nums.reduce((s, n) => s + n, 0) / nums.length;
    const stdDev = Math.sqrt(nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length);

    if (stdDev === 0) continue;

    for (const v of values) {
      const deviation = (v.total - mean) / stdDev;
      const monthStr = `${year}-${String(v.month).padStart(2, "0")}`;

      if (Math.abs(deviation) > 3) {
        alerts.push({
          id: v.id,
          severity: "critical",
          type: deviation > 0 ? "spike" : "drop",
          message: `${facility} ${sourceName} in ${monthStr} is ${Math.abs(deviation).toFixed(1)}x std dev from average`,
          facility,
          month: monthStr,
          value: v.total,
          expected: mean,
          deviation,
        });
      } else if (Math.abs(deviation) > 2) {
        alerts.push({
          id: v.id,
          severity: "warning",
          type: deviation > 0 ? "spike" : "drop",
          message: `${facility} ${sourceName} in ${monthStr} is ${Math.abs(deviation).toFixed(1)}x std dev from average`,
          facility,
          month: monthStr,
          value: v.total,
          expected: mean,
          deviation,
        });
      }
    }
  }

  alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return Math.abs(b.deviation) - Math.abs(a.deviation);
  });

  return NextResponse.json({ year, alertCount: alerts.length, alerts });
}
