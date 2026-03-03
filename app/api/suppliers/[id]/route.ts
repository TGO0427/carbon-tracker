import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { shipments: true } } },
  });
  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(supplier);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      name: body.name,
      type: body.type,
      country: body.country || null,
      city: body.city || null,
      address: body.address || null,
      contactName: body.contactName || null,
      contactEmail: body.contactEmail || null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json(supplier);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.supplier.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
