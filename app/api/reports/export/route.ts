import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function POST(request: Request) {
  const body = await request.json();
  const { periodId, scopes = [1, 2, 3], format: exportFormat = "xlsx" } = body;

  const where = {
    ...(periodId ? { reportingPeriodId: periodId } : {}),
    scope: { in: scopes },
  };

  const emissions = await prisma.emissionEntry.findMany({
    where,
    include: { emissionFactor: true, reportingPeriod: true, site: true, unit: true },
    orderBy: [{ scope: "asc" }, { sourceName: "asc" }],
  });

  const shipments = scopes.includes(3)
    ? await prisma.shipment.findMany({
        where: periodId ? { reportingPeriodId: periodId } : {},
        include: { supplier: true, legs: { orderBy: { legOrder: "asc" } } },
        orderBy: { shipmentDate: "desc" },
      })
    : [];

  const period = periodId
    ? await prisma.reportingPeriod.findUnique({ where: { id: periodId } })
    : null;

  if (exportFormat !== "xlsx") {
    return NextResponse.json({ message: "Only xlsx export is supported" }, { status: 400 });
  }

  const workbook = new ExcelJS.Workbook();

  // ── Summary sheet ──
  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Scope", key: "scope", width: 15 },
    { header: "Total (tCO2e)", key: "total", width: 20 },
    { header: "Percentage", key: "pct", width: 15 },
  ];

  const scope1 = emissions.filter((e) => e.scope === 1).reduce((s, e) => s + e.totalEmissions, 0);
  const scope2 = emissions.filter((e) => e.scope === 2).reduce((s, e) => s + e.totalEmissions, 0);
  const scope3 = emissions.filter((e) => e.scope === 3).reduce((s, e) => s + e.totalEmissions, 0) +
    shipments.reduce((s, sh) => s + sh.totalEmissions, 0);
  const total = scope1 + scope2 + scope3;

  summary.addRow({ scope: "Scope 1", total: scope1.toFixed(2), pct: total > 0 ? `${((scope1 / total) * 100).toFixed(1)}%` : "0%" });
  summary.addRow({ scope: "Scope 2", total: scope2.toFixed(2), pct: total > 0 ? `${((scope2 / total) * 100).toFixed(1)}%` : "0%" });
  summary.addRow({ scope: "Scope 3", total: scope3.toFixed(2), pct: total > 0 ? `${((scope3 / total) * 100).toFixed(1)}%` : "0%" });
  summary.addRow({ scope: "TOTAL", total: total.toFixed(2), pct: "100%" });

  // Style header
  summary.getRow(1).font = { bold: true };

  // ── Site Breakdown sheet ──
  const siteSheet = workbook.addWorksheet("Site Breakdown");
  siteSheet.columns = [
    { header: "Site", key: "site", width: 20 },
    { header: "Facility", key: "facility", width: 20 },
    { header: "Unit", key: "unit", width: 18 },
    { header: "Scope 1 (tCO2e)", key: "scope1", width: 16 },
    { header: "Scope 2 (tCO2e)", key: "scope2", width: 16 },
    { header: "Scope 3 (tCO2e)", key: "scope3", width: 16 },
    { header: "Total (tCO2e)", key: "total", width: 16 },
  ];
  siteSheet.getRow(1).font = { bold: true };

  // Group emissions by site → facility → unit
  const siteMap: Record<string, Record<string, Record<string, { scope1: number; scope2: number; scope3: number }>>> = {};

  for (const e of emissions) {
    const siteName = e.site?.name ?? "Unassigned";
    const facilityName = e.unit?.name ?? "Site-wide";
    const unitLabel = e.unit?.number ?? facilityName;

    if (!siteMap[siteName]) siteMap[siteName] = {};
    if (!siteMap[siteName][facilityName]) siteMap[siteName][facilityName] = {};
    if (!siteMap[siteName][facilityName][unitLabel]) siteMap[siteName][facilityName][unitLabel] = { scope1: 0, scope2: 0, scope3: 0 };

    const bucket = siteMap[siteName][facilityName][unitLabel];
    if (e.scope === 1) bucket.scope1 += e.totalEmissions;
    else if (e.scope === 2) bucket.scope2 += e.totalEmissions;
    else bucket.scope3 += e.totalEmissions;
  }

  for (const [siteName, facilities] of Object.entries(siteMap)) {
    for (const [facilityName, units] of Object.entries(facilities)) {
      for (const [unitLabel, vals] of Object.entries(units)) {
        const unitTotal = vals.scope1 + vals.scope2 + vals.scope3;
        siteSheet.addRow({
          site: siteName,
          facility: facilityName,
          unit: unitLabel,
          scope1: vals.scope1.toFixed(2),
          scope2: vals.scope2.toFixed(2),
          scope3: vals.scope3.toFixed(2),
          total: unitTotal.toFixed(2),
        });
      }
    }
  }

  // ── Monthly Breakdown sheet ──
  const monthlySheet = workbook.addWorksheet("Monthly Breakdown");
  monthlySheet.columns = [
    { header: "Month", key: "month", width: 12 },
    { header: "Site", key: "site", width: 15 },
    { header: "Facility", key: "facility", width: 18 },
    { header: "Source", key: "source", width: 22 },
    { header: "Scope", key: "scope", width: 8 },
    { header: "Activity Data", key: "activity", width: 15 },
    { header: "Unit", key: "unit", width: 12 },
    { header: "Emissions (tCO2e)", key: "emissions", width: 18 },
  ];
  monthlySheet.getRow(1).font = { bold: true };

  const sortedEmissions = [...emissions].sort((a, b) => {
    const dateA = new Date(a.entryDate).getTime();
    const dateB = new Date(b.entryDate).getTime();
    return dateA - dateB || a.scope - b.scope;
  });

  for (const e of sortedEmissions) {
    const date = new Date(e.entryDate);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthlySheet.addRow({
      month: monthStr,
      site: e.site?.name ?? "",
      facility: e.unit?.name ?? "Site-wide",
      source: e.sourceName,
      scope: e.scope,
      activity: e.activityData,
      unit: e.activityUnit,
      emissions: e.totalEmissions.toFixed(4),
    });
  }

  // ── Emissions Detail sheet ──
  const detail = workbook.addWorksheet("Emissions Detail");
  detail.columns = [
    { header: "Source", key: "source", width: 25 },
    { header: "Scope", key: "scope", width: 10 },
    { header: "Site", key: "site", width: 15 },
    { header: "Facility", key: "facility", width: 15 },
    { header: "Unit", key: "unit_num", width: 12 },
    { header: "Activity Data", key: "activity", width: 15 },
    { header: "Unit", key: "aunit", width: 12 },
    { header: "Factor", key: "factor", width: 12 },
    { header: "Emissions (tCO2e)", key: "emissions", width: 18 },
    { header: "Date", key: "date", width: 12 },
  ];
  detail.getRow(1).font = { bold: true };

  for (const e of emissions) {
    detail.addRow({
      source: e.sourceName,
      scope: e.scope,
      site: e.site?.name ?? "",
      facility: e.unit?.name ?? "",
      unit_num: e.unit?.number ?? "",
      activity: e.activityData,
      aunit: e.activityUnit,
      factor: e.customFactor ?? e.emissionFactor?.factor ?? "",
      emissions: e.totalEmissions.toFixed(4),
      date: new Date(e.entryDate).toLocaleDateString(),
    });
  }

  // ── Logistics sheet ──
  if (shipments.length > 0) {
    const logistics = workbook.addWorksheet("Logistics");
    logistics.columns = [
      { header: "Reference", key: "ref", width: 15 },
      { header: "Direction", key: "dir", width: 12 },
      { header: "Supplier", key: "supplier", width: 20 },
      { header: "Weight (t)", key: "weight", width: 12 },
      { header: "Legs", key: "legs", width: 8 },
      { header: "Emissions (tCO2e)", key: "emissions", width: 18 },
      { header: "Date", key: "date", width: 12 },
    ];
    logistics.getRow(1).font = { bold: true };

    for (const s of shipments) {
      logistics.addRow({
        ref: s.reference ?? "",
        dir: s.direction,
        supplier: s.supplier?.name ?? "",
        weight: s.totalWeightTonnes,
        legs: s.legs.length,
        emissions: s.totalEmissions.toFixed(4),
        date: new Date(s.shipmentDate).toLocaleDateString(),
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="carbon-report-${period?.name ?? "all"}.xlsx"`,
    },
  });
}
