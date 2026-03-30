import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};

  if (body.title !== undefined) data.title = body.title;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.status !== undefined) data.status = body.status;
  if (body.expectedReduction !== undefined) data.expectedReduction = body.expectedReduction;
  if (body.actualReduction !== undefined) data.actualReduction = body.actualReduction;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.targetDate !== undefined) data.targetDate = body.targetDate ? new Date(body.targetDate) : null;
  if (body.completedDate !== undefined) data.completedDate = body.completedDate ? new Date(body.completedDate) : null;
  if (body.siteId !== undefined) data.siteId = body.siteId || null;
  if (body.targetId !== undefined) data.targetId = body.targetId || null;
  if (body.notes !== undefined) data.notes = body.notes || null;

  // Auto-set completedDate when marking as completed
  if (body.status === "completed" && body.completedDate === undefined) {
    data.completedDate = new Date();
  }

  const actionPlan = await prisma.actionPlan.update({
    where: { id },
    data,
    include: { site: true, target: true },
  });

  return NextResponse.json(actionPlan);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.actionPlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
