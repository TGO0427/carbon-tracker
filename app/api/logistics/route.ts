import { prisma } from "@/lib/db";
import { calculateShipmentEmissions } from "@/lib/calculations";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const direction = searchParams.get("direction");
  const periodId = searchParams.get("periodId");

  const shipments = await prisma.shipment.findMany({
    where: {
      ...(direction ? { direction } : {}),
      ...(periodId ? { reportingPeriodId: periodId } : {}),
    },
    include: {
      supplier: true,
      legs: { orderBy: { legOrder: "asc" } },
    },
    orderBy: { shipmentDate: "desc" },
  });

  return NextResponse.json(shipments);
}

export async function POST(request: Request) {
  const body = await request.json();
  const legs = body.legs ?? [];

  const { legEmissions, total } = calculateShipmentEmissions(
    body.totalWeightTonnes,
    legs.map((l: { distanceKm: number; emissionFactor: number }) => ({
      distanceKm: l.distanceKm,
      emissionFactor: l.emissionFactor,
    }))
  );

  const shipment = await prisma.shipment.create({
    data: {
      reference: body.reference || null,
      direction: body.direction,
      productDescription: body.productDescription || null,
      totalWeightTonnes: body.totalWeightTonnes,
      totalEmissions: total,
      notes: body.notes || null,
      shipmentDate: body.shipmentDate ? new Date(body.shipmentDate) : new Date(),
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

  return NextResponse.json(shipment, { status: 201 });
}
