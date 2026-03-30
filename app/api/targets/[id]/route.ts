import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.emissionTarget.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
