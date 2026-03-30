import { prisma } from "@/lib/db";
import { buildDateFilter } from "@/lib/api-date-filter";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params;
  const { searchParams } = request.nextUrl;
  const facility = searchParams.get("facility"); // optional: filter by facility name (unit.name)

  // Build date filter but override siteId to this site
  const dateWhere = buildDateFilter(request, "entryDate");
  const where = { ...dateWhere, siteId };

  const emissions = await prisma.emissionEntry.findMany({
    where,
    include: { unit: true },
  });

  // Group by facility (unit.name) → then by unit
  const facilityMap: Record<string, {
    facility: string;
    scope1: number;
    scope2: number;
    scope3: number;
    total: number;
    units: Record<string, {
      unitId: string;
      unitName: string;
      unitNumber: string | null;
      scope1: number;
      scope2: number;
      scope3: number;
      total: number;
      sources: Record<string, { sourceName: string; scope: number; total: number; activityData: number; activityUnit: string }>;
    }>;
  }> = {};

  for (const e of emissions) {
    const facilityName = e.unit?.name ?? "Site-wide";
    const unitKey = e.unitId ?? "unassigned";

    if (!facilityMap[facilityName]) {
      facilityMap[facilityName] = { facility: facilityName, scope1: 0, scope2: 0, scope3: 0, total: 0, units: {} };
    }

    const fac = facilityMap[facilityName];

    if (!fac.units[unitKey]) {
      fac.units[unitKey] = {
        unitId: unitKey,
        unitName: e.unit?.name ?? "Site-wide",
        unitNumber: e.unit?.number ?? null,
        scope1: 0, scope2: 0, scope3: 0, total: 0,
        sources: {},
      };
    }

    const unit = fac.units[unitKey];
    const scopeKey = e.scope === 1 ? "scope1" : e.scope === 2 ? "scope2" : "scope3";

    fac[scopeKey] += e.totalEmissions;
    fac.total += e.totalEmissions;
    unit[scopeKey] += e.totalEmissions;
    unit.total += e.totalEmissions;

    const sourceKey = `${e.sourceName}-${unitKey}`;
    if (!unit.sources[sourceKey]) {
      unit.sources[sourceKey] = { sourceName: e.sourceName, scope: e.scope, total: 0, activityData: 0, activityUnit: e.activityUnit };
    }
    unit.sources[sourceKey].total += e.totalEmissions;
    unit.sources[sourceKey].activityData += e.activityData;
  }

  // Convert to array format
  const facilities = Object.values(facilityMap)
    .map((f) => ({
      ...f,
      units: Object.values(f.units)
        .map((u) => ({ ...u, sources: Object.values(u.sources) }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);

  // If filtering by facility name, return just that one
  if (facility) {
    const match = facilities.find((f) => f.facility === facility);
    return NextResponse.json(match ?? null);
  }

  // Site-level totals
  const siteTotals = {
    scope1: facilities.reduce((s, f) => s + f.scope1, 0),
    scope2: facilities.reduce((s, f) => s + f.scope2, 0),
    scope3: facilities.reduce((s, f) => s + f.scope3, 0),
    total: facilities.reduce((s, f) => s + f.total, 0),
  };

  return NextResponse.json({ siteId, ...siteTotals, facilities });
}
