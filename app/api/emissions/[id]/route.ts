import { prisma } from "@/lib/db";
import { calculateEmission } from "@/lib/calculations";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const entry = await prisma.emissionEntry.findUnique({
    where: { id },
    include: { emissionFactor: true, reportingPeriod: true },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  let factor = body.customFactor;
  if (!factor && body.emissionFactorId) {
    const ef = await prisma.emissionFactor.findUnique({
      where: { id: body.emissionFactorId },
    });
    if (ef) factor = ef.factor;
  }

  const totalEmissions = calculateEmission(body.activityData, factor ?? 0);

  const entry = await prisma.emissionEntry.update({
    where: { id },
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
      entryDate: body.entryDate ? new Date(body.entryDate) : undefined,
      reportingPeriodId: body.reportingPeriodId || null,
    },
    include: { emissionFactor: true },
  });

  return NextResponse.json(entry);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.emissionEntry.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
