import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const action = searchParams.get("action");
  const entity = searchParams.get("entity");

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (entity) where.entity = entity;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(logs);
}

export async function POST(request: Request) {
  const body = await request.json();

  const log = await prisma.auditLog.create({
    data: {
      action: body.action,
      entity: body.entity,
      entityId: body.entityId || null,
      details: body.details || null,
      count: body.count ?? null,
      userName: body.userName || "Admin",
    },
  });

  return NextResponse.json(log, { status: 201 });
}
