import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const factor = await prisma.emissionFactor.update({
    where: { id },
    data: {
      name: body.name,
      category: body.category,
      scope: body.scope,
      factor: body.factor,
      unit: body.unit,
      source: body.source,
      year: body.year,
    },
  });

  return NextResponse.json(factor);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.emissionFactor.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
