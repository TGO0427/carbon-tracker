import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const sites = await prisma.site.findMany({
    include: { units: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(sites);
}
