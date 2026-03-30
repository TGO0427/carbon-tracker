import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = searchParams.get("year");
  const siteId = searchParams.get("siteId");

  const where: Record<string, unknown> = {};
  if (year) where.year = Number(year);
  if (siteId) where.siteId = siteId;

  const targets = await prisma.emissionTarget.findMany({
    where,
    include: { site: true },
    orderBy: { year: "desc" },
  });

  // For each target, calculate current actual emissions
  const results = await Promise.all(
    targets.map(async (target) => {
      const yearStart = new Date(target.year, 0, 1);
      const yearEnd = new Date(target.year, 11, 31, 23, 59, 59);

      const emissionWhere: Record<string, unknown> = {
        entryDate: { gte: yearStart, lte: yearEnd },
      };
      if (target.siteId) emissionWhere.siteId = target.siteId;
      if (target.scope) emissionWhere.scope = target.scope;

      const emissions = await prisma.emissionEntry.findMany({ where: emissionWhere });
      const actual = emissions.reduce((sum, e) => sum + e.totalEmissions, 0);
      const progress = target.targetEmissions > 0 ? (actual / target.targetEmissions) * 100 : 0;
      const reduction = target.baselineEmissions > 0
        ? ((target.baselineEmissions - actual) / target.baselineEmissions) * 100
        : 0;

      return {
        ...target,
        actual,
        progress,
        reduction,
        onTrack: actual <= target.targetEmissions,
      };
    })
  );

  return NextResponse.json(results);
}

export async function POST(request: Request) {
  const body = await request.json();

  const target = await prisma.emissionTarget.create({
    data: {
      year: body.year,
      scope: body.scope || null,
      targetEmissions: body.targetEmissions,
      baselineYear: body.baselineYear,
      baselineEmissions: body.baselineEmissions,
      siteId: body.siteId || null,
      notes: body.notes || null,
    },
    include: { site: true },
  });

  return NextResponse.json(target, { status: 201 });
}
