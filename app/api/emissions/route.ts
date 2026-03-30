import { prisma } from "@/lib/db";
import { calculateEmission } from "@/lib/calculations";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const scope = searchParams.get("scope");
  const category = searchParams.get("category");
  const periodId = searchParams.get("periodId");
  const siteId = searchParams.get("siteId");

  const emissions = await prisma.emissionEntry.findMany({
    where: {
      ...(scope ? { scope: parseInt(scope) } : {}),
      ...(category ? { sourceCategory: category } : {}),
      ...(periodId ? { reportingPeriodId: periodId } : {}),
      ...(siteId ? { siteId } : {}),
    },
    include: {
      emissionFactor: true,
      reportingPeriod: true,
      site: true,
      unit: true,
    },
    orderBy: { entryDate: "desc" },
  });

  return NextResponse.json(emissions);
}

export async function POST(request: Request) {
  const body = await request.json();

  let factor = body.customFactor;
  if (!factor && body.emissionFactorId) {
    const ef = await prisma.emissionFactor.findUnique({
      where: { id: body.emissionFactorId },
    });
    if (ef) factor = ef.factor;
  }

  const totalEmissions = calculateEmission(body.activityData, factor ?? 0);

  const entry = await prisma.emissionEntry.create({
    data: {
      scope: body.scope,
      sourceName: body.sourceName,
      sourceCategory: body.sourceCategory,
      activityData: body.activityData,
      activityUnit: body.activityUnit,
      emissionFactorId: body.emissionFactorId || null,
      customFactor: body.customFactor || null,
      totalEmissions,
      notes: body.notes || null,
      entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
      reportingPeriodId: body.reportingPeriodId || null,
      siteId: body.siteId || null,
      unitId: body.unitId || null,
    },
    include: {
      emissionFactor: true,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
