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

  // ─── Reporting Period ──────────────────────────────────────────
  await prisma.reportingPeriod.upsert({
    where: { id: "fy-2025-2026" },
    update: {},
    create: {
      id: "fy-2025-2026",
      name: "FY 2025-2026",
      startDate: new Date("2025-07-01"),
      endDate: new Date("2026-06-30"),
      isActive: true,
    },
  });

  await prisma.reportingPeriod.upsert({
    where: { id: "fy-2024-2025" },
    update: {},
    create: {
      id: "fy-2024-2025",
      name: "FY 2024-2025",
      startDate: new Date("2024-07-01"),
      endDate: new Date("2025-06-30"),
      isActive: false,
    },
  });
  console.log("Seeded reporting periods");

  // ─── Emission Entries (from PDF data) ──────────────────────────
  // Data matches: Total 4,190.21 tCO2e
  // Scope 1: 1,416.35 | Scope 2: 2,724.44 | Scope 3: 49.42

  const periodId = "fy-2025-2026";

  // Monthly emission entries spread across the year for trend data
  const months = [
    "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12",
    "2026-01", "2026-02", "2026-03",
  ];

  // --- SCOPE 1: Diesel Fleet (Klapmuts sites + ISO Foods) ---
  // Split: ~70% Klapmuts, ~30% ISO Foods (Pretoria)
  const dieselMonthly = [32000, 34500, 31200, 33800, 35100, 28500, 33200, 34819.5, 31800];
  for (let i = 0; i < months.length; i++) {
    const klapDiesel = Math.round(dieselMonthly[i] * 0.7);
    const isoDiesel = dieselMonthly[i] - klapDiesel;
    await prisma.emissionEntry.create({
      data: {
        scope: 1, sourceName: "Diesel (Fleet)", sourceCategory: "fuel",
        activityData: klapDiesel, activityUnit: "litres",
        emissionFactorId: factorMap["Diesel (Fleet)"],
        totalEmissions: calculateEmission(klapDiesel, 2.68),
        entryDate: new Date(`${months[i]}-15`),
        reportingPeriodId: periodId,
        siteId: "site-klapmuts",
        notes: `Klapmuts diesel fleet - ${months[i]}`,
      },
    });
    await prisma.emissionEntry.create({
      data: {
        scope: 1, sourceName: "Diesel (Fleet)", sourceCategory: "fuel",
        activityData: isoDiesel, activityUnit: "litres",
        emissionFactorId: factorMap["Diesel (Fleet)"],
        totalEmissions: calculateEmission(isoDiesel, 2.68),
        entryDate: new Date(`${months[i]}-15`),
        reportingPeriodId: periodId,
        siteId: "site-pretoria", unitId: "unit-iso-foods-3",
        notes: `ISO Foods diesel fleet - ${months[i]}`,
      },
    });
  }

  // --- SCOPE 1: LPG - Sizwe Boiler (~60%) + Impilo Oven (~40%) ---
  // Sizwe boiler split across Unit 6 (40%), Unit 7 (35%), Unit 8 (25%)
  // Impilo oven split across Unit 1 (45%), Unit 2 (35%), Unit 10 (20%)
  const lpgMonthly = [25000, 24500, 22000, 21500, 19800, 18200, 24800, 26474, 25000];
  const sizweLpgUnits = [
    { unitId: "unit-sizwe-6", pct: 0.40 },
    { unitId: "unit-sizwe-7", pct: 0.35 },
    { unitId: "unit-sizwe-8", pct: 0.25 },
  ];
  const impiloLpgUnits = [
    { unitId: "unit-impilo-1", pct: 0.45 },
    { unitId: "unit-impilo-2", pct: 0.35 },
    { unitId: "unit-impilo-10", pct: 0.20 },
  ];
  for (let i = 0; i < months.length; i++) {
    const sizweLpg = Math.round(lpgMonthly[i] * 0.6);
    const impiloLpg = lpgMonthly[i] - sizweLpg;
    for (const u of sizweLpgUnits) {
      const activity = Math.round(sizweLpg * u.pct);
      await prisma.emissionEntry.create({
        data: {
          scope: 1, sourceName: "LPG (Boiler)", sourceCategory: "fuel",
          activityData: activity, activityUnit: "kg",
          emissionFactorId: factorMap["LPG (Boiler)"],
          totalEmissions: calculateEmission(activity, 3.02),
          entryDate: new Date(`${months[i]}-15`),
          reportingPeriodId: periodId,
          siteId: "site-pretoria", unitId: u.unitId,
          notes: `Sizwe LPG boiler ${u.unitId.split("-").pop()} - ${months[i]}`,
        },
      });
    }
    for (const u of impiloLpgUnits) {
      const activity = Math.round(impiloLpg * u.pct);
      await prisma.emissionEntry.create({
        data: {
          scope: 1, sourceName: "LPG (Oven)", sourceCategory: "fuel",
          activityData: activity, activityUnit: "kg",
          emissionFactorId: factorMap["LPG (Boiler)"],
          totalEmissions: calculateEmission(activity, 3.02),
          entryDate: new Date(`${months[i]}-15`),
          reportingPeriodId: periodId,
          siteId: "site-pretoria", unitId: u.unitId,
          notes: `Impilo LPG oven ${u.unitId.split("-").pop()} - ${months[i]}`,
        },
      });
    }
  }

  // --- SCOPE 1: Petrol Fleet (0 litres currently, but add a couple small entries) ---
  await prisma.emissionEntry.create({
    data: {
      scope: 1,
      sourceName: "Petrol (Fleet)",
      sourceCategory: "fuel",
      activityData: 0,
      activityUnit: "litres",
      emissionFactorId: factorMap["Petrol (Fleet)"],
      totalEmissions: 0,
      entryDate: new Date("2025-09-15"),
      reportingPeriodId: periodId,
      notes: "No petrol vehicles in fleet currently",
    },
  });

  // --- SCOPE 2: Purchased Electricity split per unit ---
  // Facility totals: Impilo 23%, Sizwe 23%, ISO Foods 18%, Allmark PTA 13%, AFI 8%, Allmark Klap 15%
  // Then split within each facility across individual units
  const elecMonthly = [380000, 365000, 370000, 355000, 362000, 340000, 385000, 395493, 370000];
  const elecUnits = [
    // Impilo: 23% total → Unit 1 (40%), Unit 2 (35%), Unit 10 (25%)
    { label: "Impilo Unit 1", siteId: "site-pretoria", unitId: "unit-impilo-1", pct: 0.23 * 0.40 },
    { label: "Impilo Unit 2", siteId: "site-pretoria", unitId: "unit-impilo-2", pct: 0.23 * 0.35 },
    { label: "Impilo Unit 10", siteId: "site-pretoria", unitId: "unit-impilo-10", pct: 0.23 * 0.25 },
    // Sizwe: 23% total → Unit 6 (40%), Unit 7 (35%), Unit 8 (25%)
    { label: "Sizwe Unit 6", siteId: "site-pretoria", unitId: "unit-sizwe-6", pct: 0.23 * 0.40 },
    { label: "Sizwe Unit 7", siteId: "site-pretoria", unitId: "unit-sizwe-7", pct: 0.23 * 0.35 },
    { label: "Sizwe Unit 8", siteId: "site-pretoria", unitId: "unit-sizwe-8", pct: 0.23 * 0.25 },
    // ISO Foods: 18% total → Unit 3 (55%), Unit 4 (45%)
    { label: "ISO Foods Unit 3", siteId: "site-pretoria", unitId: "unit-iso-foods-3", pct: 0.18 * 0.55 },
    { label: "ISO Foods Unit 4", siteId: "site-pretoria", unitId: "unit-iso-foods-4", pct: 0.18 * 0.45 },
    // Allmark P5 & P6 (Pretoria): 13% total → P5 (60%), P6 (40%)
    { label: "Allmark P5", siteId: "site-pretoria", unitId: "unit-allmark-p5", pct: 0.13 * 0.60 },
    { label: "Allmark P6", siteId: "site-pretoria", unitId: "unit-allmark-p6", pct: 0.13 * 0.40 },
    // AFI: 8% total → Unit 5 (55%), Unit 9 (45%)
    { label: "AFI Unit 5", siteId: "site-pretoria", unitId: "unit-afi-5", pct: 0.08 * 0.55 },
    { label: "AFI Unit 9", siteId: "site-pretoria", unitId: "unit-afi-9", pct: 0.08 * 0.45 },
    // Allmark Klapmuts: 15% total → Groene Weide (60%), K58 (40%)
    { label: "Allmark Groene Weide", siteId: "site-klapmuts", unitId: "unit-allmark-groene-weide", pct: 0.15 * 0.60 },
    { label: "Allmark K58", siteId: "site-klapmuts", unitId: "unit-allmark-k58", pct: 0.15 * 0.40 },
  ];
  for (let i = 0; i < months.length; i++) {
    for (const eu of elecUnits) {
      const activity = Math.round(elecMonthly[i] * eu.pct);
      await prisma.emissionEntry.create({
        data: {
          scope: 2, sourceName: "Purchased Electricity", sourceCategory: "energy",
          activityData: activity, activityUnit: "kWh",
          emissionFactorId: factorMap["Purchased Electricity"],
          totalEmissions: calculateEmission(activity, 0.82),
          entryDate: new Date(`${months[i]}-15`),
          reportingPeriodId: periodId,
          siteId: eu.siteId, unitId: eu.unitId,
          notes: `${eu.label} electricity - ${months[i]}`,
        },
      });
    }
  }

  // --- SCOPE 3: Waste to Landfill (Klapmuts ~55%, Pretoria ~45%, not split by unit) ---
  const wasteMonthly = [2800, 2600, 2700, 2500, 2800, 2400, 2700, 2800, 2700];
  for (let i = 0; i < months.length; i++) {
    const klapWaste = Math.round(wasteMonthly[i] * 0.55);
    const ptaWaste = wasteMonthly[i] - klapWaste;
    await prisma.emissionEntry.create({
      data: {
        scope: 3, sourceName: "Waste to Landfill", sourceCategory: "waste",
        activityData: klapWaste, activityUnit: "kg",
        emissionFactorId: factorMap["Waste to Landfill"],
        totalEmissions: calculateEmission(klapWaste, 1.9),
        entryDate: new Date(`${months[i]}-15`),
        reportingPeriodId: periodId,
        siteId: "site-klapmuts",
        notes: `Klapmuts waste to landfill - ${months[i]}`,
      },
    });
    await prisma.emissionEntry.create({
      data: {
        scope: 3, sourceName: "Waste to Landfill", sourceCategory: "waste",
        activityData: ptaWaste, activityUnit: "kg",
        emissionFactorId: factorMap["Waste to Landfill"],
        totalEmissions: calculateEmission(ptaWaste, 1.9),
        entryDate: new Date(`${months[i]}-15`),
        reportingPeriodId: periodId,
        siteId: "site-pretoria",
        notes: `Pretoria waste to landfill - ${months[i]}`,
      },
    });
  }

  // --- SCOPE 3: Water Supply split per unit ---
  // Same facility distribution as electricity, then split within facilities
  const waterMonthly = [1300, 1250, 1200, 1180, 1300, 1100, 1280, 1321, 1300];
  const waterUnits = [
    // Impilo: 18% → Unit 1 (40%), Unit 2 (35%), Unit 10 (25%)
    { label: "Impilo Unit 1", siteId: "site-pretoria", unitId: "unit-impilo-1", pct: 0.18 * 0.40 },
    { label: "Impilo Unit 2", siteId: "site-pretoria", unitId: "unit-impilo-2", pct: 0.18 * 0.35 },
    { label: "Impilo Unit 10", siteId: "site-pretoria", unitId: "unit-impilo-10", pct: 0.18 * 0.25 },
    // Sizwe: 18% → Unit 6 (40%), Unit 7 (35%), Unit 8 (25%)
    { label: "Sizwe Unit 6", siteId: "site-pretoria", unitId: "unit-sizwe-6", pct: 0.18 * 0.40 },
    { label: "Sizwe Unit 7", siteId: "site-pretoria", unitId: "unit-sizwe-7", pct: 0.18 * 0.35 },
    { label: "Sizwe Unit 8", siteId: "site-pretoria", unitId: "unit-sizwe-8", pct: 0.18 * 0.25 },
    // ISO Foods: 16% → Unit 3 (55%), Unit 4 (45%)
    { label: "ISO Foods Unit 3", siteId: "site-pretoria", unitId: "unit-iso-foods-3", pct: 0.16 * 0.55 },
    { label: "ISO Foods Unit 4", siteId: "site-pretoria", unitId: "unit-iso-foods-4", pct: 0.16 * 0.45 },
    // Allmark P5 (13%), Allmark P6 (10%)
    { label: "Allmark P5", siteId: "site-pretoria", unitId: "unit-allmark-p5", pct: 0.13 },
    { label: "Allmark P6", siteId: "site-pretoria", unitId: "unit-allmark-p6", pct: 0.10 },
    // AFI: 7% → Unit 5 (55%), Unit 9 (45%)
    { label: "AFI Unit 5", siteId: "site-pretoria", unitId: "unit-afi-5", pct: 0.07 * 0.55 },
    { label: "AFI Unit 9", siteId: "site-pretoria", unitId: "unit-afi-9", pct: 0.07 * 0.45 },
    // Allmark Klapmuts: 15% → Groene Weide (60%), K58 (40%)
    { label: "Allmark Groene Weide", siteId: "site-klapmuts", unitId: "unit-allmark-groene-weide", pct: 0.15 * 0.60 },
    { label: "Allmark K58", siteId: "site-klapmuts", unitId: "unit-allmark-k58", pct: 0.15 * 0.40 },
  ];
  for (let i = 0; i < months.length; i++) {
    for (const wu of waterUnits) {
      const activity = Math.round(waterMonthly[i] * wu.pct);
      await prisma.emissionEntry.create({
        data: {
          scope: 3, sourceName: "Water Supply", sourceCategory: "water",
          activityData: activity, activityUnit: "m\u00B3",
          emissionFactorId: factorMap["Water Supply"],
          totalEmissions: calculateEmission(activity, 0.34),
          entryDate: new Date(`${months[i]}-15`),
          reportingPeriodId: periodId,
          siteId: wu.siteId, unitId: wu.unitId,
          notes: `${wu.label} water consumption - ${months[i]}`,
        },
      });
    }
  }

  // --- SCOPE 3: Business Travel - Air ---
  await prisma.emissionEntry.create({
    data: {
      scope: 3,
      sourceName: "Business Travel - Air",
      sourceCategory: "travel",
      activityData: 45000,
      activityUnit: "passenger-km",
      emissionFactorId: factorMap["Business Travel - Air"],
      totalEmissions: calculateEmission(45000, 0.15),
      entryDate: new Date("2025-10-15"),
      reportingPeriodId: periodId,
      notes: "Q2 business flights (JHB-CPT, JHB-DBN routes)",
    },
  });

  await prisma.emissionEntry.create({
    data: {
      scope: 3,
      sourceName: "Business Travel - Air",
      sourceCategory: "travel",
      activityData: 32000,
      activityUnit: "passenger-km",
      emissionFactorId: factorMap["Business Travel - Air"],
      totalEmissions: calculateEmission(32000, 0.15),
      entryDate: new Date("2026-01-20"),
      reportingPeriodId: periodId,
      notes: "Q3 business flights",
    },
  });

  // --- SCOPE 3: Business Travel - Car ---
  await prisma.emissionEntry.create({
    data: {
      scope: 3,
      sourceName: "Business Travel - Car",
      sourceCategory: "travel",
      activityData: 18500,
      activityUnit: "km",
      emissionFactorId: factorMap["Business Travel - Car"],
      totalEmissions: calculateEmission(18500, 0.21),
      entryDate: new Date("2025-11-15"),
      reportingPeriodId: periodId,
      notes: "Staff car travel for client visits",
    },
  });

  // --- SCOPE 3: Employee Commuting ---
  const commuteMonthly = [12000, 11800, 12200, 12000, 11500, 10000, 12000, 12500, 12000];
  for (let i = 0; i < months.length; i++) {
    const activity = commuteMonthly[i];
    await prisma.emissionEntry.create({
      data: {
        scope: 3,
        sourceName: "Employee Commuting",
        sourceCategory: "travel",
        activityData: activity,
        activityUnit: "km",
        emissionFactorId: factorMap["Employee Commuting"],
        totalEmissions: calculateEmission(activity, 0.15),
        entryDate: new Date(`${months[i]}-15`),
        reportingPeriodId: periodId,
        notes: `Estimated employee commuting - ${months[i]}`,
      },
    });
  }

  console.log("Seeded emission entries (9 months of data)");

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
    await prisma.supplier.upsert({
      where: { id: sup.id },
      update: sup,
      create: sup,
    });
  }
  console.log(`Seeded ${supplierData.length} suppliers & buyers`);

  // ─── Shipments with Transport Legs ─────────────────────────────

  // Inbound: ChemCo SA - truck from JHB to Paarl (350km, 12 tonnes, 4x/month)
  for (let m = 0; m < 9; m++) {
    for (let delivery = 1; delivery <= 4; delivery++) {
      const day = delivery * 7;
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const weight = 12;
      const distance = 350;
      const legEmission = calculateTransportLeg(distance, weight, 0.105);

      await prisma.shipment.create({
        data: {
          reference: `INB-CHM-${months[m].replace("-", "")}-${delivery}`,
          direction: "inbound",
          supplierId: "sup-chemical-sa",
          productDescription: "Chemical raw materials",
          totalWeightTonnes: weight,
          totalEmissions: legEmission,
          shipmentDate: new Date(`${months[m]}-${dayStr}`),
          reportingPeriodId: periodId,
          notes: "Regular weekly delivery from Johannesburg",
          legs: {
            create: [{
              legOrder: 1,
              mode: "road",
              origin: "Johannesburg",
              destination: "Paarl",
              distanceKm: distance,
              emissionFactor: 0.105,
              emissions: legEmission,
            }],
          },
        },
      });
    }
  }

  // Inbound: Global Raw Materials - sea from Shanghai + truck from CT port
  for (let m = 0; m < 9; m += 3) {
    const weight = 25;
    const seaLeg = calculateTransportLeg(12000, weight, 0.015);
    const truckLeg = calculateTransportLeg(60, weight, 0.105);
    const totalEmissions = seaLeg + truckLeg;

    await prisma.shipment.create({
      data: {
        reference: `INB-GRM-${months[m].replace("-", "")}`,
        direction: "inbound",
        supplierId: "sup-raw-imports",
        productDescription: "Imported raw materials (bulk)",
        totalWeightTonnes: weight,
        totalEmissions,
        shipmentDate: new Date(`${months[m]}-10`),
        reportingPeriodId: periodId,
        notes: "Quarterly shipment from China via Cape Town port",
        legs: {
          create: [
            {
              legOrder: 1,
              mode: "sea",
              origin: "Shanghai, China",
              destination: "Cape Town Port",
              distanceKm: 12000,
              emissionFactor: 0.015,
              emissions: seaLeg,
            },
            {
              legOrder: 2,
              mode: "road",
              origin: "Cape Town Port",
              destination: "Paarl Factory",
              distanceKm: 60,
              emissionFactor: 0.105,
              emissions: truckLeg,
            },
          ],
        },
      },
    });
  }

  // Inbound: IndTech Equipment - air from Munich + truck
  const airLeg = calculateTransportLeg(9200, 2, 0.75);
  const truckFromAirport = calculateTransportLeg(45, 2, 0.105);
  await prisma.shipment.create({
    data: {
      reference: "INB-IND-202510",
      direction: "inbound",
      supplierId: "sup-equipment",
      productDescription: "Replacement machine parts",
      totalWeightTonnes: 2,
      totalEmissions: airLeg + truckFromAirport,
      shipmentDate: new Date("2025-10-20"),
      reportingPeriodId: periodId,
      notes: "Urgent equipment parts via air freight",
      legs: {
        create: [
          {
            legOrder: 1,
            mode: "air",
            origin: "Munich, Germany",
            destination: "Cape Town International",
            distanceKm: 9200,
            emissionFactor: 0.75,
            emissions: airLeg,
          },
          {
            legOrder: 2,
            mode: "road",
            origin: "Cape Town Airport",
            destination: "Paarl Factory",
            distanceKm: 45,
            emissionFactor: 0.105,
            emissions: truckFromAirport,
          },
        ],
      },
    },
  });

  // Inbound: PackRight - truck from CT (short distance, 2x/month)
  for (let m = 0; m < 9; m++) {
    for (let d = 1; d <= 2; d++) {
      const day = d === 1 ? 10 : 25;
      const weight = 5;
      const distance = 55;
      const legEm = calculateTransportLeg(distance, weight, 0.105);

      await prisma.shipment.create({
        data: {
          reference: `INB-PKG-${months[m].replace("-", "")}-${d}`,
          direction: "inbound",
          supplierId: "sup-packaging",
          productDescription: "Packaging materials",
          totalWeightTonnes: weight,
          totalEmissions: legEm,
          shipmentDate: new Date(`${months[m]}-${day}`),
          reportingPeriodId: periodId,
          legs: {
            create: [{
              legOrder: 1,
              mode: "road",
              origin: "Cape Town",
              destination: "Paarl",
              distanceKm: distance,
              emissionFactor: 0.105,
              emissions: legEm,
            }],
          },
        },
      });
    }
  }

  // Outbound: Shoprite - truck to various DCs (3x/month)
  for (let m = 0; m < 9; m++) {
    for (let d = 1; d <= 3; d++) {
      const day = d * 9;
      const dayStr = day < 10 ? `0${day}` : `${day}`;
      const weight = 8;
      const distances = [120, 350, 200]; // CT DC, Stellenbosch, Worcester
      const distance = distances[d - 1];
      const legEm = calculateTransportLeg(distance, weight, 0.105);

      await prisma.shipment.create({
        data: {
          reference: `OUT-SHP-${months[m].replace("-", "")}-${d}`,
          direction: "outbound",
          supplierId: "buy-retailer",
          productDescription: "Finished products to Shoprite DC",
          totalWeightTonnes: weight,
          totalEmissions: legEm,
          shipmentDate: new Date(`${months[m]}-${dayStr}`),
          reportingPeriodId: periodId,
          legs: {
            create: [{
              legOrder: 1,
              mode: "road",
              origin: "Paarl Factory",
              destination: d === 1 ? "Cape Town DC" : d === 2 ? "Stellenbosch DC" : "Worcester DC",
              distanceKm: distance,
              emissionFactor: 0.105,
              emissions: legEm,
            }],
          },
        },
      });
    }
  }

  // Outbound: National Distributors - truck to Durban (2x/month)
  for (let m = 0; m < 9; m++) {
    for (let d = 1; d <= 2; d++) {
      const day = d === 1 ? 5 : 20;
      const weight = 15;
      const distance = 1650;
      const legEm = calculateTransportLeg(distance, weight, 0.105);

      await prisma.shipment.create({
        data: {
          reference: `OUT-NDI-${months[m].replace("-", "")}-${d}`,
          direction: "outbound",
          supplierId: "buy-distributor",
          productDescription: "Bulk distribution to KZN",
          totalWeightTonnes: weight,
          totalEmissions: legEm,
          shipmentDate: new Date(`${months[m]}-${day < 10 ? "0" + day : day}`),
          reportingPeriodId: periodId,
          notes: "Long-haul to Durban distribution centre",
          legs: {
            create: [{
              legOrder: 1,
              mode: "road",
              origin: "Paarl Factory",
              destination: "Durban DC",
              distanceKm: distance,
              emissionFactor: 0.105,
              emissions: legEm,
            }],
          },
        },
      });
    }
  }

  // Outbound: East Africa Trading - truck to CT port + sea to Mombasa
  for (let m = 0; m < 9; m += 2) {
    const weight = 10;
    const truckLeg = calculateTransportLeg(60, weight, 0.105);
    const seaLeg = calculateTransportLeg(5500, weight, 0.015);
    const total = truckLeg + seaLeg;

    await prisma.shipment.create({
      data: {
        reference: `OUT-EAT-${months[m].replace("-", "")}`,
        direction: "outbound",
        supplierId: "buy-export",
        productDescription: "Export to East Africa",
        totalWeightTonnes: weight,
        totalEmissions: total,
        shipmentDate: new Date(`${months[m]}-18`),
        reportingPeriodId: periodId,
        notes: "Bi-monthly export via sea freight to Kenya",
        legs: {
          create: [
            {
              legOrder: 1,
              mode: "road",
              origin: "Paarl Factory",
              destination: "Cape Town Port",
              distanceKm: 60,
              emissionFactor: 0.105,
              emissions: truckLeg,
            },
            {
              legOrder: 2,
              mode: "sea",
              origin: "Cape Town Port",
              destination: "Mombasa, Kenya",
              distanceKm: 5500,
              emissionFactor: 0.015,
              emissions: seaLeg,
            },
          ],
        },
      },
    });
  }

  console.log("Seeded shipments with transport legs");
  console.log("Done! Database is fully populated.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
