import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const scope = searchParams.get("scope");
  const category = searchParams.get("category");

  const factors = await prisma.emissionFactor.findMany({
    where: {
      ...(scope ? { scope: parseInt(scope) } : {}),
      ...(category ? { category } : {}),
    },
    orderBy: [{ scope: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(factors);
}

export async function POST(request: Request) {
  const body = await request.json();
  const factor = await prisma.emissionFactor.create({
    data: {
      name: body.name,
      category: body.category,
      scope: body.scope,
      factor: body.factor,
      unit: body.unit,
      source: body.source ?? "Custom",
      year: body.year ?? new Date().getFullYear(),
    },
  });
  return NextResponse.json(factor, { status: 201 });
}
