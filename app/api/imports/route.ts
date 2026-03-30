import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export interface ParsedEntry {
  section: string;
  facility: string;
  siteId: string;
  month: string;       // "2025-01"
  activityData: number;
  activityUnit: string;
  scope: number;
  sourceName: string;
  sourceCategory: string;
  emissionFactorName: string;
  factor: number;
  totalEmissions: number;
  // Unit distribution
  units: { unitId: string; unitLabel: string; pct: number }[];
}

interface FacilityConfig {
  facility: string;
  siteId: string;
  scope: number;
  sourceName: string;
  sourceCategory: string;
  activityUnit: string;
  emissionFactorName: string;
  factor: number;
  units: { unitId: string; unitLabel: string; pct: number }[];
}

// Map Excel row labels to facility configurations
const ELECTRICITY_MAP: Record<string, FacilityConfig> = {
  "impilo": {
    facility: "Impilo", siteId: "site-pretoria", scope: 2,
    sourceName: "Purchased Electricity", sourceCategory: "energy",
    activityUnit: "kWh", emissionFactorName: "Purchased Electricity", factor: 0.82,
    units: [
      { unitId: "unit-impilo-1", unitLabel: "Unit 1", pct: 0.40 },
      { unitId: "unit-impilo-2", unitLabel: "Unit 2", pct: 0.35 },
      { unitId: "unit-impilo-10", unitLabel: "Unit 10", pct: 0.25 },
    ],
  },
  "sizwe": {
    facility: "Sizwe", siteId: "site-pretoria", scope: 2,
    sourceName: "Purchased Electricity", sourceCategory: "energy",
    activityUnit: "kWh", emissionFactorName: "Purchased Electricity", factor: 0.82,
    units: [
      { unitId: "unit-sizwe-6", unitLabel: "Unit 6", pct: 0.40 },
      { unitId: "unit-sizwe-7", unitLabel: "Unit 7", pct: 0.35 },
      { unitId: "unit-sizwe-8", unitLabel: "Unit 8", pct: 0.25 },
    ],
  },
  "iso foods": {
    facility: "ISO Foods", siteId: "site-pretoria", scope: 2,
    sourceName: "Purchased Electricity", sourceCategory: "energy",
    activityUnit: "kWh", emissionFactorName: "Purchased Electricity", factor: 0.82,
    units: [
      { unitId: "unit-iso-foods-3", unitLabel: "Unit 3", pct: 0.55 },
      { unitId: "unit-iso-foods-4", unitLabel: "Unit 4", pct: 0.45 },
    ],
  },
  "allmark p5": {
    facility: "Allmark P5&P6", siteId: "site-pretoria", scope: 2,
    sourceName: "Purchased Electricity", sourceCategory: "energy",
    activityUnit: "kWh", emissionFactorName: "Purchased Electricity", factor: 0.82,
    units: [
      { unitId: "unit-allmark-p5", unitLabel: "P5", pct: 0.60 },
      { unitId: "unit-allmark-p6", unitLabel: "P6", pct: 0.40 },
    ],
  },
  "allmark klapmuts": {
    facility: "Allmark Klapmuts", siteId: "site-klapmuts", scope: 2,
    sourceName: "Purchased Electricity", sourceCategory: "energy",
    activityUnit: "kWh", emissionFactorName: "Purchased Electricity", factor: 0.82,
    units: [
      { unitId: "unit-allmark-groene-weide", unitLabel: "Groene Weide", pct: 0.60 },
      { unitId: "unit-allmark-k58", unitLabel: "K58", pct: 0.40 },
    ],
  },
};

const WATER_MAP: Record<string, FacilityConfig> = {
  "impilo": {
    facility: "Impilo", siteId: "site-pretoria", scope: 3,
    sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    units: [
      { unitId: "unit-impilo-1", unitLabel: "Unit 1", pct: 0.40 },
      { unitId: "unit-impilo-2", unitLabel: "Unit 2", pct: 0.35 },
      { unitId: "unit-impilo-10", unitLabel: "Unit 10", pct: 0.25 },
    ],
  },
  "sizwe": {
    facility: "Sizwe", siteId: "site-pretoria", scope: 3,
    sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    units: [
      { unitId: "unit-sizwe-6", unitLabel: "Unit 6", pct: 0.40 },
      { unitId: "unit-sizwe-7", unitLabel: "Unit 7", pct: 0.35 },
      { unitId: "unit-sizwe-8", unitLabel: "Unit 8", pct: 0.25 },
    ],
  },
  "iso foods": {
    facility: "ISO Foods", siteId: "site-pretoria", scope: 3,
    sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    units: [
      { unitId: "unit-iso-foods-3", unitLabel: "Unit 3", pct: 0.55 },
      { unitId: "unit-iso-foods-4", unitLabel: "Unit 4", pct: 0.45 },
    ],
  },
  "allmark p5": {
    facility: "Allmark P5", siteId: "site-pretoria", scope: 3,
    sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    units: [{ unitId: "unit-allmark-p5", unitLabel: "P5", pct: 1.0 }],
  },
  "allmark p9": {
    facility: "Allmark P6", siteId: "site-pretoria", scope: 3,
    sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    units: [{ unitId: "unit-allmark-p6", unitLabel: "P6", pct: 1.0 }],
  },
  "allmark klapmuts": {
    facility: "Allmark Klapmuts", siteId: "site-klapmuts", scope: 3,
    sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    units: [
      { unitId: "unit-allmark-groene-weide", unitLabel: "Groene Weide", pct: 0.60 },
      { unitId: "unit-allmark-k58", unitLabel: "K58", pct: 0.40 },
    ],
  },
};

const LPG_MAP: Record<string, FacilityConfig> = {
  "impilo": {
    facility: "Impilo (Oven)", siteId: "site-pretoria", scope: 1,
    sourceName: "LPG (Oven)", sourceCategory: "fuel",
    activityUnit: "kg", emissionFactorName: "LPG (Boiler)", factor: 3.02,
    units: [
      { unitId: "unit-impilo-1", unitLabel: "Unit 1", pct: 0.45 },
      { unitId: "unit-impilo-2", unitLabel: "Unit 2", pct: 0.35 },
      { unitId: "unit-impilo-10", unitLabel: "Unit 10", pct: 0.20 },
    ],
  },
  "sizwe": {
    facility: "Sizwe (Boiler)", siteId: "site-pretoria", scope: 1,
    sourceName: "LPG (Boiler)", sourceCategory: "fuel",
    activityUnit: "kg", emissionFactorName: "LPG (Boiler)", factor: 3.02,
    units: [
      { unitId: "unit-sizwe-6", unitLabel: "Unit 6", pct: 0.40 },
      { unitId: "unit-sizwe-7", unitLabel: "Unit 7", pct: 0.35 },
      { unitId: "unit-sizwe-8", unitLabel: "Unit 8", pct: 0.25 },
    ],
  },
};

const DIESEL_MAP: Record<string, FacilityConfig> = {
  "klapmuts": {
    facility: "Klapmuts Fleet", siteId: "site-klapmuts", scope: 1,
    sourceName: "Diesel (Fleet)", sourceCategory: "fuel",
    activityUnit: "litres", emissionFactorName: "Diesel (Fleet)", factor: 2.68,
    units: [
      { unitId: "unit-allmark-groene-weide", unitLabel: "Groene Weide", pct: 0.60 },
      { unitId: "unit-allmark-k58", unitLabel: "K58", pct: 0.40 },
    ],
  },
  "iso foods": {
    facility: "ISO Foods Fleet", siteId: "site-pretoria", scope: 1,
    sourceName: "Diesel (Fleet)", sourceCategory: "fuel",
    activityUnit: "litres", emissionFactorName: "Diesel (Fleet)", factor: 2.68,
    units: [
      { unitId: "unit-iso-foods-3", unitLabel: "Unit 3", pct: 0.55 },
      { unitId: "unit-iso-foods-4", unitLabel: "Unit 4", pct: 0.45 },
    ],
  },
};

function matchFacility(label: string, map: Record<string, FacilityConfig>): FacilityConfig | null {
  const lower = label.toLowerCase();
  for (const [key, config] of Object.entries(map)) {
    if (lower.includes(key)) return config;
  }
  return null;
}

function getCellNumber(cell: ExcelJS.Cell): number | null {
  const v = cell.value;
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && "result" in v) {
    const r = (v as { result: unknown }).result;
    if (typeof r === "number") return r;
  }
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function detectYear(ws: ExcelJS.Worksheet): number {
  // Look for year in header row (Row 1)
  const row1 = ws.getRow(1);
  const headerText = String(row1.getCell(1).value ?? "");
  const match = headerText.match(/20\d{2}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const arrayBuffer = await file.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(arrayBuffer as never);

  const ws = wb.worksheets[0];
  if (!ws) return NextResponse.json({ error: "No worksheet found" }, { status: 400 });

  const year = detectYear(ws);
  const entries: ParsedEntry[] = [];

  // Scan rows to identify sections and extract data
  let currentSection = "";

  ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
    const label = String(row.getCell(1).value ?? "").trim();
    const labelLower = label.toLowerCase();

    // Detect section headers
    if (labelLower.includes("electricity usage")) { currentSection = "electricity"; return; }
    if (labelLower.includes("water consumption")) { currentSection = "water"; return; }
    if (labelLower.includes("lp gas usage") || labelLower.includes("lpg")) { currentSection = "lpg"; return; }
    if (labelLower.includes("fuel usage")) { currentSection = "diesel"; return; }

    // Skip header rows, production rows, usage ratio rows, empty labels
    if (!label || labelLower.includes("production") || labelLower.includes("usage") ||
        labelLower.includes("energy kwh") || labelLower.includes("note") ||
        labelLower.includes("borehole") || label === "Total") return;
    // Skip month header rows
    if (row.getCell(2).value === "Jan") return;

    // Try to match facility
    const map = currentSection === "electricity" ? ELECTRICITY_MAP
      : currentSection === "water" ? WATER_MAP
      : currentSection === "lpg" ? LPG_MAP
      : currentSection === "diesel" ? DIESEL_MAP
      : null;

    if (!map) return;
    const config = matchFacility(label, map);
    if (!config) return;

    // Extract 12 months of data (columns B-M = 2-13)
    for (let col = 2; col <= 13; col++) {
      const monthIdx = col - 2; // 0-11
      const val = getCellNumber(row.getCell(col));
      if (val === null || val === 0) continue;

      const month = `${year}-${String(monthIdx + 1).padStart(2, "0")}`;
      const totalEmissions = (val * config.factor) / 1000;

      entries.push({
        section: currentSection,
        facility: config.facility,
        siteId: config.siteId,
        month,
        activityData: val,
        activityUnit: config.activityUnit,
        scope: config.scope,
        sourceName: config.sourceName,
        sourceCategory: config.sourceCategory,
        emissionFactorName: config.emissionFactorName,
        factor: config.factor,
        totalEmissions,
        units: config.units,
      });
    }
  });

  return NextResponse.json({
    year,
    fileName: file.name,
    entryCount: entries.length,
    entries,
    summary: {
      electricity: entries.filter((e) => e.section === "electricity").length,
      water: entries.filter((e) => e.section === "water").length,
      lpg: entries.filter((e) => e.section === "lpg").length,
      diesel: entries.filter((e) => e.section === "diesel").length,
    },
  });
}
