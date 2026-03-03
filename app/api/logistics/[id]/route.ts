import { prisma } from "@/lib/db";
import { calculateShipmentEmissions } from "@/lib/calculations";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      supplier: true,
      legs: { orderBy: { legOrder: "asc" } },
      reportingPeriod: true,
    },
  });
  if (!shipment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(shipment);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const legs = body.legs ?? [];

  const { legEmissions, total } = calculateShipmentEmissions(
    body.totalWeightTonnes,
    legs.map((l: { distanceKm: number; emissionFactor: number }) => ({
      distanceKm: l.distanceKm,
      emissionFactor: l.emissionFactor,
    }))
  );

  // Delete existing legs and recreate
  await prisma.transportLeg.deleteMany({ where: { shipmentId: id } });

  const shipment = await prisma.shipment.update({
    where: { id },
    data: {
      reference: body.reference || null,
      direction: body.direction,
      productDescription: body.productDescription || null,
      totalWeightTonnes: body.totalWeightTonnes,
      totalEmissions: total,
      notes: body.notes || null,
      shipmentDate: body.shipmentDate ? new Date(body.shipmentDate) : undefined,
      supplierId: body.supplierId || null,
      reportingPeriodId: body.reportingPeriodId || null,
      legs: {
        create: legs.map((l: { mode: string; origin?: string; destination?: string; distanceKm: number; emissionFactor: number; notes?: string }, i: number) => ({
          legOrder: i + 1,
          mode: l.mode,
          origin: l.origin || null,
          destination: l.destination || null,
          distanceKm: l.distanceKm,
          emissionFactor: l.emissionFactor,
          emissions: legEmissions[i],
          notes: l.notes || null,
        })),
      },
    },
    include: {
      supplier: true,
      legs: { orderBy: { legOrder: "asc" } },
    },
  });

  return NextResponse.json(shipment);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.shipment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
