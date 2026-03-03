import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type");

  const suppliers = await prisma.supplier.findMany({
    where: type ? { type } : {},
    include: { _count: { select: { shipments: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(suppliers);
}

export async function POST(request: Request) {
  const body = await request.json();
  const supplier = await prisma.supplier.create({
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
  return NextResponse.json(supplier, { status: 201 });
}
