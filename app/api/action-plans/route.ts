import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const actionPlans = await prisma.actionPlan.findMany({
    include: { site: true, target: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(actionPlans);
}

export async function POST(request: Request) {
  const body = await request.json();

  const actionPlan = await prisma.actionPlan.create({
    data: {
      title: body.title,
      description: body.description || null,
      status: body.status || "planned",
      expectedReduction: body.expectedReduction,
      actualReduction: body.actualReduction ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      completedDate: body.completedDate ? new Date(body.completedDate) : null,
      siteId: body.siteId || null,
      targetId: body.targetId || null,
      notes: body.notes || null,
    },
    include: { site: true, target: true },
  });

  return NextResponse.json(actionPlan, { status: 201 });
}
