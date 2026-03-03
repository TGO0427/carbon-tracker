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
    include: { emissionFactor: true, reportingPeriod: true },
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

  if (exportFormat === "xlsx") {
    const workbook = new ExcelJS.Workbook();

    // Summary sheet
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

    // Emissions detail sheet
    const detail = workbook.addWorksheet("Emissions Detail");
    detail.columns = [
      { header: "Source", key: "source", width: 25 },
      { header: "Scope", key: "scope", width: 10 },
      { header: "Activity Data", key: "activity", width: 15 },
      { header: "Unit", key: "unit", width: 15 },
      { header: "Factor", key: "factor", width: 12 },
      { header: "Emissions (tCO2e)", key: "emissions", width: 18 },
      { header: "Date", key: "date", width: 12 },
    ];

    for (const e of emissions) {
      detail.addRow({
        source: e.sourceName,
        scope: e.scope,
        activity: e.activityData,
        unit: e.activityUnit,
        factor: e.customFactor ?? e.emissionFactor?.factor ?? "",
        emissions: e.totalEmissions.toFixed(4),
        date: new Date(e.entryDate).toLocaleDateString(),
      });
    }

    // Logistics sheet (if scope 3 included)
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

  // For non-xlsx, return JSON summary
  return NextResponse.json({ message: "Only xlsx export is supported" }, { status: 400 });
}
