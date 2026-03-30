import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = Number(searchParams.get("year") || new Date().getFullYear());

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  const emissions = await prisma.emissionEntry.findMany({
    where: { entryDate: { gte: startDate, lte: endDate } },
    include: { site: true, unit: true },
  });

  const shipments = await prisma.shipment.findMany({
    where: { shipmentDate: { gte: startDate, lte: endDate } },
  });

  const sites = await prisma.site.findMany({ include: { units: true } });

  // Calculate totals
  const scope1 = emissions.filter((e) => e.scope === 1).reduce((s, e) => s + e.totalEmissions, 0);
  const scope2 = emissions.filter((e) => e.scope === 2).reduce((s, e) => s + e.totalEmissions, 0);
  const scope3Entries = emissions.filter((e) => e.scope === 3).reduce((s, e) => s + e.totalEmissions, 0);
  const scope3Logistics = shipments.reduce((s, sh) => s + sh.totalEmissions, 0);
  const scope3 = scope3Entries + scope3Logistics;
  const total = scope1 + scope2 + scope3;

  // Group by site
  const siteTotals: Record<string, { name: string; scope1: number; scope2: number; scope3: number; total: number }> = {};
  for (const site of sites) {
    siteTotals[site.id] = { name: site.name, scope1: 0, scope2: 0, scope3: 0, total: 0 };
  }
  for (const e of emissions) {
    if (e.siteId && siteTotals[e.siteId]) {
      const bucket = siteTotals[e.siteId];
      if (e.scope === 1) bucket.scope1 += e.totalEmissions;
      else if (e.scope === 2) bucket.scope2 += e.totalEmissions;
      else bucket.scope3 += e.totalEmissions;
      bucket.total += e.totalEmissions;
    }
  }

  // Group by source
  const sourceMap: Record<string, { scope: number; total: number }> = {};
  for (const e of emissions) {
    if (!sourceMap[e.sourceName]) sourceMap[e.sourceName] = { scope: e.scope, total: 0 };
    sourceMap[e.sourceName].total += e.totalEmissions;
  }
  const sourceList = Object.entries(sourceMap).sort((a, b) => b[1].total - a[1].total);

  // Monthly trend
  const monthly: Record<number, number> = {};
  for (const e of emissions) {
    const m = new Date(e.entryDate).getMonth();
    monthly[m] = (monthly[m] ?? 0) + e.totalEmissions;
  }

  // Build PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  const fmt = (n: number) => n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Title Page ──
  doc.setFillColor(6, 78, 59); // emerald-900
  doc.rect(0, 0, pageWidth, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text("GHG Protocol Report", margin, 35);
  doc.setFontSize(14);
  doc.text(`Carbon Footprint Assessment ${year}`, margin, 50);
  doc.setFontSize(10);
  doc.text("Synercore Holdings (Pty) Ltd", margin, 65);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-ZA")}`, margin, 72);

  // ── Executive Summary ──
  y = 100;
  doc.setTextColor(6, 78, 59);
  doc.setFontSize(16);
  doc.text("Executive Summary", margin, y);
  y += 10;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.text(`Total greenhouse gas emissions for ${year}: ${fmt(total)} tCO2e`, margin, y); y += 7;
  doc.text(`Scope 1 (Direct): ${fmt(scope1)} tCO2e (${total > 0 ? ((scope1 / total) * 100).toFixed(1) : 0}%)`, margin, y); y += 7;
  doc.text(`Scope 2 (Purchased Energy): ${fmt(scope2)} tCO2e (${total > 0 ? ((scope2 / total) * 100).toFixed(1) : 0}%)`, margin, y); y += 7;
  doc.text(`Scope 3 (Other Indirect): ${fmt(scope3)} tCO2e (${total > 0 ? ((scope3 / total) * 100).toFixed(1) : 0}%)`, margin, y); y += 15;

  // ── Scope Breakdown Table ──
  doc.setTextColor(6, 78, 59);
  doc.setFontSize(14);
  doc.text("Scope Breakdown", margin, y); y += 8;

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageWidth - 2 * margin, 8, "F");
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.text("Scope", margin + 2, y + 5.5);
  doc.text("Description", margin + 35, y + 5.5);
  doc.text("tCO2e", pageWidth - margin - 30, y + 5.5);
  doc.text("%", pageWidth - margin - 8, y + 5.5);
  y += 10;

  const scopeRows = [
    { scope: "Scope 1", desc: "Direct emissions (fleet fuel, LPG)", val: scope1 },
    { scope: "Scope 2", desc: "Purchased electricity (Eskom grid)", val: scope2 },
    { scope: "Scope 3", desc: "Water, waste, logistics", val: scope3 },
  ];

  doc.setTextColor(40, 40, 40);
  for (const row of scopeRows) {
    doc.text(row.scope, margin + 2, y + 5);
    doc.text(row.desc, margin + 35, y + 5);
    doc.text(fmt(row.val), pageWidth - margin - 30, y + 5);
    doc.text(total > 0 ? `${((row.val / total) * 100).toFixed(1)}%` : "0%", pageWidth - margin - 8, y + 5);
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y + 8, pageWidth - margin, y + 8);
    y += 10;
  }

  // Total row
  doc.setFont(undefined as unknown as string, "bold");
  doc.text("TOTAL", margin + 2, y + 5);
  doc.text(fmt(total), pageWidth - margin - 30, y + 5);
  doc.text("100%", pageWidth - margin - 8, y + 5);
  doc.setFont(undefined as unknown as string, "normal");
  y += 15;

  // ── Site Breakdown ──
  doc.setTextColor(6, 78, 59);
  doc.setFontSize(14);
  doc.text("Emissions by Site", margin, y); y += 8;

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageWidth - 2 * margin, 8, "F");
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.text("Site", margin + 2, y + 5.5);
  doc.text("Scope 1", margin + 60, y + 5.5);
  doc.text("Scope 2", margin + 90, y + 5.5);
  doc.text("Scope 3", margin + 120, y + 5.5);
  doc.text("Total", pageWidth - margin - 25, y + 5.5);
  y += 10;

  doc.setTextColor(40, 40, 40);
  for (const st of Object.values(siteTotals)) {
    doc.text(st.name, margin + 2, y + 5);
    doc.text(fmt(st.scope1), margin + 60, y + 5);
    doc.text(fmt(st.scope2), margin + 90, y + 5);
    doc.text(fmt(st.scope3), margin + 120, y + 5);
    doc.text(fmt(st.total), pageWidth - margin - 25, y + 5);
    doc.line(margin, y + 8, pageWidth - margin, y + 8);
    y += 10;
  }
  y += 10;

  // ── Source Breakdown ──
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setTextColor(6, 78, 59);
  doc.setFontSize(14);
  doc.text("Emissions by Source", margin, y); y += 8;

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageWidth - 2 * margin, 8, "F");
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(9);
  doc.text("Source", margin + 2, y + 5.5);
  doc.text("Scope", margin + 80, y + 5.5);
  doc.text("tCO2e", pageWidth - margin - 25, y + 5.5);
  y += 10;

  doc.setTextColor(40, 40, 40);
  for (const [name, data] of sourceList.slice(0, 10)) {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.text(name, margin + 2, y + 5);
    doc.text(`Scope ${data.scope}`, margin + 80, y + 5);
    doc.text(fmt(data.total), pageWidth - margin - 25, y + 5);
    doc.line(margin, y + 8, pageWidth - margin, y + 8);
    y += 10;
  }
  y += 10;

  // ── Methodology ──
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setTextColor(6, 78, 59);
  doc.setFontSize(14);
  doc.text("Methodology", margin, y); y += 10;

  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  const methodLines = [
    "This report follows the GHG Protocol Corporate Standard for greenhouse gas accounting.",
    "Organisational boundary: Operational control approach.",
    "",
    "Scope 1: Direct emissions from fleet diesel and LPG usage at owned facilities.",
    "Scope 2: Indirect emissions from purchased electricity (Eskom SA grid factor: 0.82 kg CO2e/kWh).",
    "Scope 3: Other indirect emissions including water supply, waste to landfill, and logistics.",
    "",
    "Emission factors sourced from UK DEFRA (2024) and Eskom (SA Grid, 2024).",
    "Activity data sourced from facility meters, invoices, and fleet management records.",
    "All emissions reported in tonnes of carbon dioxide equivalent (tCO2e).",
  ];
  for (const line of methodLines) {
    doc.text(line, margin, y);
    y += 6;
  }

  // ── Footer on all pages ──
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Synercore Holdings - GHG Report ${year}`, margin, 290);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - margin - 20, 290);
  }

  const pdfBuffer = doc.output("arraybuffer");

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Synercore-GHG-Report-${year}.pdf"`,
    },
  });
}
