import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const period = await prisma.reportingPeriod.update({
    where: { id },
    data: {
      name: body.name,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      isActive: body.isActive,
    },
  });

  if (body.isActive) {
    await prisma.reportingPeriod.updateMany({
      where: { id: { not: id } },
      data: { isActive: false },
    });
  }

  return NextResponse.json(period);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.reportingPeriod.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
