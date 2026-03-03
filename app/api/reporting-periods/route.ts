import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const periods = await prisma.reportingPeriod.findMany({
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json(periods);
}

export async function POST(request: Request) {
  const body = await request.json();
  const period = await prisma.reportingPeriod.create({
    data: {
      name: body.name,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      isActive: body.isActive ?? false,
    },
  });

  if (body.isActive) {
    await prisma.reportingPeriod.updateMany({
      where: { id: { not: period.id } },
      data: { isActive: false },
    });
  }

  return NextResponse.json(period, { status: 201 });
}
