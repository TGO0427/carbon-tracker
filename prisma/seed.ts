import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function calculateEmission(activityData: number, factor: number) {
  return (activityData * factor) / 1000;
}

function calculateTransportLeg(distanceKm: number, weightTonnes: number, factor: number) {
  return (distanceKm * weightTonnes * factor) / 1000;
}

async function main() {
  // ─── Emission Factors (UK DEFRA + SA Grid) ─────────────────────
  const factors = [
    { name: "Diesel (Fleet)", category: "fuel", scope: 1, factor: 2.68, unit: "kg CO2e/litre", source: "UK DEFRA", year: 2024 },
    { name: "Petrol (Fleet)", category: "fuel", scope: 1, factor: 2.31, unit: "kg CO2e/litre", source: "UK DEFRA", year: 2024 },
    { name: "LPG (Boiler)", category: "fuel", scope: 1, factor: 3.02, unit: "kg CO2e/kg", source: "UK DEFRA", year: 2024 },
    { name: "Natural Gas", category: "fuel", scope: 1, factor: 56.1, unit: "kg CO2e/GJ", source: "UK DEFRA", year: 2024 },
    { name: "Refrigerant Loss", category: "refrigerant", scope: 1, factor: 1430, unit: "kg CO2e/kg", source: "UK DEFRA", year: 2024 },
    { name: "Purchased Electricity", category: "energy", scope: 2, factor: 0.82, unit: "kg CO2e/kWh", source: "Eskom (SA Grid)", year: 2024 },
    { name: "Steam/Heat Purchased", category: "energy", scope: 2, factor: 56.1, unit: "kg CO2e/GJ", source: "UK DEFRA", year: 2024 },
    { name: "Business Travel - Air", category: "travel", scope: 3, factor: 0.15, unit: "kg CO2e/passenger-km", source: "UK DEFRA", year: 2024 },
    { name: "Business Travel - Car", category: "travel", scope: 3, factor: 0.21, unit: "kg CO2e/km", source: "UK DEFRA", year: 2024 },
    { name: "Employee Commuting", category: "travel", scope: 3, factor: 0.15, unit: "kg CO2e/km", source: "UK DEFRA", year: 2024 },
    { name: "Waste to Landfill", category: "waste", scope: 3, factor: 1.9, unit: "kg CO2e/kg", source: "UK DEFRA", year: 2024 },
    { name: "Water Supply", category: "water", scope: 3, factor: 0.34, unit: "kg CO2e/m\u00B3", source: "UK DEFRA", year: 2024 },
    { name: "Heavy Freight Truck", category: "transport", scope: 3, factor: 0.105, unit: "kg CO2e/tonne-km", source: "UK DEFRA", year: 2024 },
    { name: "Sea Freight", category: "transport", scope: 3, factor: 0.015, unit: "kg CO2e/tonne-km", source: "UK DEFRA", year: 2024 },
    { name: "Air Freight", category: "transport", scope: 3, factor: 0.75, unit: "kg CO2e/tonne-km", source: "UK DEFRA", year: 2024 },
    { name: "Rail Freight", category: "transport", scope: 3, factor: 0.028, unit: "kg CO2e/tonne-km", source: "UK DEFRA", year: 2024 },
  ];

  const factorMap: Record<string, string> = {};
  for (const factor of factors) {
    const id = factor.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    factorMap[factor.name] = id;
    await prisma.emissionFactor.upsert({
      where: { id },
      update: factor,
      create: { id, ...factor },
    });
  }
  console.log(`Seeded ${factors.length} emission factors`);

  // ─── Sites & Units ─────────────────────────────────────────────
  const sitesData = [
    {
      id: "site-klapmuts",
      name: "Klapmuts",
      location: "Klapmuts, Western Cape",
      units: [
        { id: "unit-allmark-groene-weide", name: "Allmark", number: "Groene Weide" },
        { id: "unit-allmark-k58", name: "Allmark", number: "K58" },
      ],
    },
    {
      id: "site-pretoria",
      name: "Pretoria",
      location: "Pretoria, Gauteng",
      units: [
        { id: "unit-sizwe-6", name: "Sizwe", number: "Unit 6" },
        { id: "unit-sizwe-7", name: "Sizwe", number: "Unit 7" },
        { id: "unit-sizwe-8", name: "Sizwe", number: "Unit 8" },
        { id: "unit-impilo-1", name: "Impilo", number: "Unit 1" },
        { id: "unit-impilo-2", name: "Impilo", number: "Unit 2" },
        { id: "unit-impilo-10", name: "Impilo", number: "Unit 10" },
        { id: "unit-allmark-p5", name: "Allmark", number: "P5" },
        { id: "unit-allmark-p6", name: "Allmark", number: "P6" },
        { id: "unit-iso-foods-3", name: "ISO Foods", number: "Unit 3" },
        { id: "unit-iso-foods-4", name: "ISO Foods", number: "Unit 4" },
        { id: "unit-afi-5", name: "AFI", number: "Unit 5" },
        { id: "unit-afi-9", name: "AFI", number: "Unit 9" },
      ],
    },
  ];

  for (const site of sitesData) {
    await prisma.site.upsert({
      where: { id: site.id },
      update: { name: site.name, location: site.location },
      create: { id: site.id, name: site.name, location: site.location },
    });
    for (const unit of site.units) {
      await prisma.unit.upsert({
        where: { id: unit.id },
        update: { name: unit.name, number: unit.number, siteId: site.id },
        create: { id: unit.id, name: unit.name, number: unit.number, siteId: site.id },
      });
    }
  }
  console.log("Seeded sites & units");

  // ─── Reporting Periods ─────────────────────────────────────────
  await prisma.reportingPeriod.upsert({
    where: { id: "fy-2025-2026" },
    update: {},
    create: { id: "fy-2025-2026", name: "FY 2025-2026", startDate: new Date("2025-07-01"), endDate: new Date("2026-06-30"), isActive: true },
  });
  await prisma.reportingPeriod.upsert({
    where: { id: "fy-2024-2025" },
    update: {},
    create: { id: "fy-2024-2025", name: "FY 2024-2025", startDate: new Date("2024-07-01"), endDate: new Date("2025-06-30"), isActive: false },
  });
  console.log("Seeded reporting periods");

  // ═══════════════════════════════════════════════════════════════
  // REAL 2025 DATA from "Data 2025 (4).xlsx"
  // ═══════════════════════════════════════════════════════════════

  const periodId = "fy-2025-2026";
  const months2025 = [
    "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06",
    "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
  ];

  // Helper to create emission entries for a facility, splitting across units
  async function seedFacilityMonthly(opts: {
    scope: number; sourceName: string; sourceCategory: string; activityUnit: string;
    emissionFactorName: string; factor: number;
    siteId: string;
    monthlyData: (number | null)[];  // 12 months, null = no data
    units: { unitId: string; pct: number }[];
  }) {
    for (let i = 0; i < 12; i++) {
      const total = opts.monthlyData[i];
      if (total === null || total === 0) continue;
      for (const u of opts.units) {
        const activity = Math.round(total * u.pct);
        if (activity === 0) continue;
        await prisma.emissionEntry.create({
          data: {
            scope: opts.scope,
            sourceName: opts.sourceName,
            sourceCategory: opts.sourceCategory,
            activityData: activity,
            activityUnit: opts.activityUnit,
            emissionFactorId: factorMap[opts.emissionFactorName],
            totalEmissions: calculateEmission(activity, opts.factor),
            entryDate: new Date(`${months2025[i]}-15`),
            reportingPeriodId: periodId,
            siteId: opts.siteId,
            unitId: u.unitId,
          },
        });
      }
    }
  }

  // ─── SCOPE 2: ELECTRICITY (kWh) — Real data ───────────────────

  // Impilo total kWh per month (Row 3)
  // Split across Unit 1 (40%), Unit 2 (35%), Unit 10 (25%)
  await seedFacilityMonthly({
    scope: 2, sourceName: "Purchased Electricity", sourceCategory: "energy",
    activityUnit: "kWh", emissionFactorName: "Purchased Electricity", factor: 0.82,
    siteId: "site-pretoria",
    monthlyData: [99017, 86707, 104523, 95857, 111910, 100661, 113751, 96180, 89624, 112985, 117203, 66198],
    units: [
      { unitId: "unit-impilo-1", pct: 0.40 },
      { unitId: "unit-impilo-2", pct: 0.35 },
      { unitId: "unit-impilo-10", pct: 0.25 },
    ],
  });

  // Sizwe total kWh per month (Row 6)
  // Split across Unit 6 (40%), Unit 7 (35%), Unit 8 (25%)
  await seedFacilityMonthly({
    scope: 2, sourceName: "Purchased Electricity", sourceCategory: "energy",
    activityUnit: "kWh", emissionFactorName: "Purchased Electricity", factor: 0.82,
    siteId: "site-pretoria",
    monthlyData: [71664, 103363, 130404, 74074, 28163, 37964, 49401, 108187, 111200, 92205, 61047, 46518],
    units: [
      { unitId: "unit-sizwe-6", pct: 0.40 },
      { unitId: "unit-sizwe-7", pct: 0.35 },
      { unitId: "unit-sizwe-8", pct: 0.25 },
    ],
  });

  // ISO Foods total kWh per month (Row 9)
  // Split across Unit 3 (55%), Unit 4 (45%)
  await seedFacilityMonthly({
    scope: 2, sourceName: "Purchased Electricity", sourceCategory: "energy",
    activityUnit: "kWh", emissionFactorName: "Purchased Electricity", factor: 0.82,
    siteId: "site-pretoria",
    monthlyData: [42680, 60720, 57280, 73840, 84960, 70200, 80960, 70840, 27320, 81600, 87640, 54600],
    units: [
      { unitId: "unit-iso-foods-3", pct: 0.55 },
      { unitId: "unit-iso-foods-4", pct: 0.45 },
    ],
  });

  // Allmark P5 & P9 total kWh per month (Row 12)
  // Split across P5 (60%), P6 (40%)
  await seedFacilityMonthly({
    scope: 2, sourceName: "Purchased Electricity", sourceCategory: "energy",
    activityUnit: "kWh", emissionFactorName: "Purchased Electricity", factor: 0.82,
    siteId: "site-pretoria",
    monthlyData: [23686, 21600, 24081, 23630, 25576, 28342, 23104, 24076, 24358, 25301, 10720, 15373],
    units: [
      { unitId: "unit-allmark-p5", pct: 0.60 },
      { unitId: "unit-allmark-p6", pct: 0.40 },
    ],
  });

  // Allmark Klapmuts kWh per month (Row 15) — flat 12600/month
  // Split across Groene Weide (60%), K58 (40%)
  await seedFacilityMonthly({
    scope: 2, sourceName: "Purchased Electricity", sourceCategory: "energy",
    activityUnit: "kWh", emissionFactorName: "Purchased Electricity", factor: 0.82,
    siteId: "site-klapmuts",
    monthlyData: [12600, 12600, 12600, 12600, 12600, 12600, 12600, 12600, 12600, 12600, 12600, 12600],
    units: [
      { unitId: "unit-allmark-groene-weide", pct: 0.60 },
      { unitId: "unit-allmark-k58", pct: 0.40 },
    ],
  });

  console.log("Seeded electricity (real data)");

  // ─── SCOPE 3: WATER (kL = m³) — Real data ─────────────────────

  // Impilo water kL per month (Row 21) — Dec missing
  await seedFacilityMonthly({
    scope: 3, sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    siteId: "site-pretoria",
    monthlyData: [63, 55, 44, 44, 44, 48, 68, 39, 45, 51, 53, null],
    units: [
      { unitId: "unit-impilo-1", pct: 0.40 },
      { unitId: "unit-impilo-2", pct: 0.35 },
      { unitId: "unit-impilo-10", pct: 0.25 },
    ],
  });

  // Sizwe water kL per month (Row 24) — Dec missing
  await seedFacilityMonthly({
    scope: 3, sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    siteId: "site-pretoria",
    monthlyData: [222, 223, 204, 177, 177, 167, 138, 187, 231, 239, 208, null],
    units: [
      { unitId: "unit-sizwe-6", pct: 0.40 },
      { unitId: "unit-sizwe-7", pct: 0.35 },
      { unitId: "unit-sizwe-8", pct: 0.25 },
    ],
  });

  // ISO Foods water kL per month (Row 26) — Dec missing
  await seedFacilityMonthly({
    scope: 3, sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    siteId: "site-pretoria",
    monthlyData: [226, 340, 245, 320, 320, 424, 441, 322, 144, 323, 321, null],
    units: [
      { unitId: "unit-iso-foods-3", pct: 0.55 },
      { unitId: "unit-iso-foods-4", pct: 0.45 },
    ],
  });

  // Allmark P5 water kL per month (Row 28) — Dec missing
  await seedFacilityMonthly({
    scope: 3, sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    siteId: "site-pretoria",
    monthlyData: [174, 189, 197, 204, 239, 215, 223, 169, 145, 158, 157, null],
    units: [{ unitId: "unit-allmark-p5", pct: 1.0 }],
  });

  // Allmark P9 (P6) water kL per month (Row 29) — Dec missing
  await seedFacilityMonthly({
    scope: 3, sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    siteId: "site-pretoria",
    monthlyData: [49, 74, 74, 64, 76, 64, 76, 58, 57, 59, 65, null],
    units: [{ unitId: "unit-allmark-p6", pct: 1.0 }],
  });

  // Allmark Klapmuts water kL per month (Row 32) — Oct-Dec missing
  await seedFacilityMonthly({
    scope: 3, sourceName: "Water Supply", sourceCategory: "water",
    activityUnit: "m\u00B3", emissionFactorName: "Water Supply", factor: 0.34,
    siteId: "site-klapmuts",
    monthlyData: [250, 101, 281, 218, 308, 164, 295, 337, 337, null, null, null],
    units: [
      { unitId: "unit-allmark-groene-weide", pct: 0.60 },
      { unitId: "unit-allmark-k58", pct: 0.40 },
    ],
  });

  console.log("Seeded water (real data)");

  // ─── SCOPE 1: LPG GAS (kg) — Real data ────────────────────────

  // Impilo LPG Oven kg per month (Row 41)
  await seedFacilityMonthly({
    scope: 1, sourceName: "LPG (Oven)", sourceCategory: "fuel",
    activityUnit: "kg", emissionFactorName: "LPG (Boiler)", factor: 3.02,
    siteId: "site-pretoria",
    monthlyData: [9461, 6001, 6429, 10452, 10504, 10358, 13108, 9956, 8632, 13413, 13036, 4469],
    units: [
      { unitId: "unit-impilo-1", pct: 0.45 },
      { unitId: "unit-impilo-2", pct: 0.35 },
      { unitId: "unit-impilo-10", pct: 0.20 },
    ],
  });

  // Sizwe LPG Boiler kg per month (Row 44)
  await seedFacilityMonthly({
    scope: 1, sourceName: "LPG (Boiler)", sourceCategory: "fuel",
    activityUnit: "kg", emissionFactorName: "LPG (Boiler)", factor: 3.02,
    siteId: "site-pretoria",
    monthlyData: [2134, 5954, 7671, 4162, 7616, 6771, 5475, 10339, 12668, 12945, 8200, 7520],
    units: [
      { unitId: "unit-sizwe-6", pct: 0.40 },
      { unitId: "unit-sizwe-7", pct: 0.35 },
      { unitId: "unit-sizwe-8", pct: 0.25 },
    ],
  });

  console.log("Seeded LPG gas (real data)");

  // ─── SCOPE 1: DIESEL FUEL (litres) — Real data ────────────────

  // Klapmuts diesel litres per month (Row 50)
  await seedFacilityMonthly({
    scope: 1, sourceName: "Diesel (Fleet)", sourceCategory: "fuel",
    activityUnit: "litres", emissionFactorName: "Diesel (Fleet)", factor: 2.68,
    siteId: "site-klapmuts",
    monthlyData: [750, 1050, 1000, 800, 900, 600, 1000, 600, 750, 861, 1016.5, 348],
    units: [
      { unitId: "unit-allmark-groene-weide", pct: 0.60 },
      { unitId: "unit-allmark-k58", pct: 0.40 },
    ],
  });

  // ISO Foods diesel litres per month (Row 54)
  await seedFacilityMonthly({
    scope: 1, sourceName: "Diesel (Fleet)", sourceCategory: "fuel",
    activityUnit: "litres", emissionFactorName: "Diesel (Fleet)", factor: 2.68,
    siteId: "site-pretoria",
    monthlyData: [20900, 19455, 19493, 24493, 30805, 32028, 31185, 25072, 11000, 28356, 28612, 13845],
    units: [
      { unitId: "unit-iso-foods-3", pct: 0.55 },
      { unitId: "unit-iso-foods-4", pct: 0.45 },
    ],
  });

  console.log("Seeded diesel fuel (real data)");

  // ─── SCOPE 3: WASTE TO LANDFILL — From Sheet2 total ────────────
  // Total: 24,000 kg for the year, split evenly across 12 months
  // Measured at site level (Klapmuts 55%, Pretoria 45%)
  for (let i = 0; i < 12; i++) {
    const monthlyWaste = 2000; // 24000 / 12
    await prisma.emissionEntry.create({
      data: {
        scope: 3, sourceName: "Waste to Landfill", sourceCategory: "waste",
        activityData: Math.round(monthlyWaste * 0.55), activityUnit: "kg",
        emissionFactorId: factorMap["Waste to Landfill"],
        totalEmissions: calculateEmission(Math.round(monthlyWaste * 0.55), 1.9),
        entryDate: new Date(`${months2025[i]}-15`),
        reportingPeriodId: periodId,
        siteId: "site-klapmuts",
      },
    });
    await prisma.emissionEntry.create({
      data: {
        scope: 3, sourceName: "Waste to Landfill", sourceCategory: "waste",
        activityData: Math.round(monthlyWaste * 0.45), activityUnit: "kg",
        emissionFactorId: factorMap["Waste to Landfill"],
        totalEmissions: calculateEmission(Math.round(monthlyWaste * 0.45), 1.9),
        entryDate: new Date(`${months2025[i]}-15`),
        reportingPeriodId: periodId,
        siteId: "site-pretoria",
      },
    });
  }

  console.log("Seeded waste (real data)");
  console.log("Seeded all emission entries (real 2025 data)");

  // ─── Suppliers ─────────────────────────────────────────────────
  const supplierData = [
    { id: "sup-chemical-sa", name: "ChemCo South Africa", type: "supplier", country: "South Africa", city: "Johannesburg", notes: "Primary chemical supplier" },
    { id: "sup-packaging", name: "PackRight Holdings", type: "supplier", country: "South Africa", city: "Cape Town", notes: "Packaging materials" },
    { id: "sup-raw-imports", name: "Global Raw Materials Ltd", type: "supplier", country: "China", city: "Shanghai", notes: "Imported raw materials" },
    { id: "sup-equipment", name: "IndTech Equipment", type: "supplier", country: "Germany", city: "Munich", notes: "Machinery and parts" },
    { id: "buy-retailer", name: "Shoprite Holdings", type: "buyer", country: "South Africa", city: "Cape Town", notes: "Major retail customer" },
    { id: "buy-distributor", name: "National Distributors", type: "buyer", country: "South Africa", city: "Durban", notes: "Eastern Cape & KZN distribution" },
    { id: "buy-export", name: "East Africa Trading Co.", type: "buyer", country: "Kenya", city: "Nairobi", notes: "Export customer" },
    { id: "sup-fuel", name: "Engen Petroleum", type: "supplier", country: "South Africa", city: "Durban", notes: "Fleet fuel supplier" },
  ];

  for (const sup of supplierData) {
    await prisma.supplier.upsert({ where: { id: sup.id }, update: sup, create: sup });
  }
  console.log(`Seeded ${supplierData.length} suppliers & buyers`);

  // ─── Shipments with Transport Legs ─────────────────────────────
  const shippingMonths = [
    "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
    "2026-01", "2026-02", "2026-03",
  ];

  // Inbound: ChemCo SA - truck from JHB to Paarl (350km, 12t, 4x/month)
  for (let m = 0; m < shippingMonths.length; m++) {
    for (let d = 1; d <= 4; d++) {
      const day = d * 7;
      const legEm = calculateTransportLeg(350, 12, 0.105);
      await prisma.shipment.create({
        data: {
          reference: `INB-CHM-${shippingMonths[m].replace("-", "")}-${d}`,
          direction: "inbound", supplierId: "sup-chemical-sa",
          productDescription: "Chemical raw materials",
          totalWeightTonnes: 12, totalEmissions: legEm,
          shipmentDate: new Date(`${shippingMonths[m]}-${day < 10 ? "0" + day : day}`),
          reportingPeriodId: periodId,
          legs: { create: [{ legOrder: 1, mode: "road", origin: "Johannesburg", destination: "Paarl", distanceKm: 350, emissionFactor: 0.105, emissions: legEm }] },
        },
      });
    }
  }

  // Inbound: Global Raw Materials - sea from Shanghai + truck (quarterly)
  for (let m = 0; m < shippingMonths.length; m += 3) {
    const seaLeg = calculateTransportLeg(12000, 25, 0.015);
    const truckLeg = calculateTransportLeg(60, 25, 0.105);
    await prisma.shipment.create({
      data: {
        reference: `INB-GRM-${shippingMonths[m].replace("-", "")}`,
        direction: "inbound", supplierId: "sup-raw-imports",
        productDescription: "Imported raw materials (bulk)",
        totalWeightTonnes: 25, totalEmissions: seaLeg + truckLeg,
        shipmentDate: new Date(`${shippingMonths[m]}-10`),
        reportingPeriodId: periodId,
        legs: { create: [
          { legOrder: 1, mode: "sea", origin: "Shanghai, China", destination: "Cape Town Port", distanceKm: 12000, emissionFactor: 0.015, emissions: seaLeg },
          { legOrder: 2, mode: "road", origin: "Cape Town Port", destination: "Paarl Factory", distanceKm: 60, emissionFactor: 0.105, emissions: truckLeg },
        ] },
      },
    });
  }

  // Outbound: Shoprite (3x/month)
  for (let m = 0; m < shippingMonths.length; m++) {
    for (let d = 1; d <= 3; d++) {
      const day = d * 9;
      const distances = [120, 350, 200];
      const legEm = calculateTransportLeg(distances[d - 1], 8, 0.105);
      await prisma.shipment.create({
        data: {
          reference: `OUT-SHP-${shippingMonths[m].replace("-", "")}-${d}`,
          direction: "outbound", supplierId: "buy-retailer",
          productDescription: "Finished products to Shoprite DC",
          totalWeightTonnes: 8, totalEmissions: legEm,
          shipmentDate: new Date(`${shippingMonths[m]}-${day < 10 ? "0" + day : day}`),
          reportingPeriodId: periodId,
          legs: { create: [{ legOrder: 1, mode: "road", origin: "Paarl Factory", destination: d === 1 ? "Cape Town DC" : d === 2 ? "Stellenbosch DC" : "Worcester DC", distanceKm: distances[d - 1], emissionFactor: 0.105, emissions: legEm }] },
        },
      });
    }
  }

  // Outbound: National Distributors - Durban (2x/month)
  for (let m = 0; m < shippingMonths.length; m++) {
    for (let d = 1; d <= 2; d++) {
      const day = d === 1 ? 5 : 20;
      const legEm = calculateTransportLeg(1650, 15, 0.105);
      await prisma.shipment.create({
        data: {
          reference: `OUT-NDI-${shippingMonths[m].replace("-", "")}-${d}`,
          direction: "outbound", supplierId: "buy-distributor",
          productDescription: "Bulk distribution to KZN",
          totalWeightTonnes: 15, totalEmissions: legEm,
          shipmentDate: new Date(`${shippingMonths[m]}-${day < 10 ? "0" + day : day}`),
          reportingPeriodId: periodId,
          legs: { create: [{ legOrder: 1, mode: "road", origin: "Paarl Factory", destination: "Durban DC", distanceKm: 1650, emissionFactor: 0.105, emissions: legEm }] },
        },
      });
    }
  }

  // Outbound: East Africa Trading - sea to Mombasa (bi-monthly)
  for (let m = 0; m < shippingMonths.length; m += 2) {
    const truckLeg = calculateTransportLeg(60, 10, 0.105);
    const seaLeg = calculateTransportLeg(5500, 10, 0.015);
    await prisma.shipment.create({
      data: {
        reference: `OUT-EAT-${shippingMonths[m].replace("-", "")}`,
        direction: "outbound", supplierId: "buy-export",
        productDescription: "Export to East Africa",
        totalWeightTonnes: 10, totalEmissions: truckLeg + seaLeg,
        shipmentDate: new Date(`${shippingMonths[m]}-18`),
        reportingPeriodId: periodId,
        legs: { create: [
          { legOrder: 1, mode: "road", origin: "Paarl Factory", destination: "Cape Town Port", distanceKm: 60, emissionFactor: 0.105, emissions: truckLeg },
          { legOrder: 2, mode: "sea", origin: "Cape Town Port", destination: "Mombasa, Kenya", distanceKm: 5500, emissionFactor: 0.015, emissions: seaLeg },
        ] },
      },
    });
  }

  console.log("Seeded shipments with transport legs");
  console.log("Done! Database populated with real 2025 data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
