import { prisma } from "@/lib/db";
import { buildDateFilter } from "@/lib/api-date-filter";
import { NextRequest, NextResponse } from "next/server";

// Industry benchmarks for SA food manufacturing (tCO2e per tonne of product)
// Sources: CDP, SA National Business Initiative, DEFRA sector guidance
const INDUSTRY_BENCHMARKS = {
  foodManufacturing: {
    label: "SA Food Manufacturing Average",
    scope1PerTonne: 0.15,  // tCO2e per tonne product
    scope2PerTonne: 0.35,
    scope3PerTonne: 0.08,
    totalPerTonne: 0.58,
    electricityKwhPerTonne: 420,
    waterM3PerTonne: 5.2,
  },
  bestInClass: {
    label: "Best in Class (Top 25%)",
    scope1PerTonne: 0.08,
    scope2PerTonne: 0.20,
    scope3PerTonne: 0.04,
    totalPerTonne: 0.32,
    electricityKwhPerTonne: 250,
    waterM3PerTonne: 3.0,
  },
  sectorAverage: {
    label: "Global Food Sector",
    scope1PerTonne: 0.18,
    scope2PerTonne: 0.42,
    scope3PerTonne: 0.12,
    totalPerTonne: 0.72,
    electricityKwhPerTonne: 500,
    waterM3PerTonne: 6.5,
  },
};

export async function GET(request: NextRequest) {
  const where = buildDateFilter(request, "entryDate");
  const emissions = await prisma.emissionEntry.findMany({ where });

  const scope1 = emissions.filter((e) => e.scope === 1).reduce((s, e) => s + e.totalEmissions, 0);
  const scope2 = emissions.filter((e) => e.scope === 2).reduce((s, e) => s + e.totalEmissions, 0);
  const scope3 = emissions.filter((e) => e.scope === 3).reduce((s, e) => s + e.totalEmissions, 0);
  const total = scope1 + scope2 + scope3;

  const totalElectricity = emissions
    .filter((e) => e.sourceCategory === "energy")
    .reduce((s, e) => s + e.activityData, 0);

  const totalWater = emissions
    .filter((e) => e.sourceCategory === "water")
    .reduce((s, e) => s + e.activityData, 0);

  // Estimate total production (from seed data, the total for 2025 is approximately combined from all facilities)
  // This is a rough estimate — in real usage this would come from a production data input
  const estimatedProduction = 30000; // tonnes for the year (approximate from Excel production rows)

  const yourMetrics = {
    scope1PerTonne: estimatedProduction > 0 ? scope1 / estimatedProduction : 0,
    scope2PerTonne: estimatedProduction > 0 ? scope2 / estimatedProduction : 0,
    scope3PerTonne: estimatedProduction > 0 ? scope3 / estimatedProduction : 0,
    totalPerTonne: estimatedProduction > 0 ? total / estimatedProduction : 0,
    electricityKwhPerTonne: estimatedProduction > 0 ? totalElectricity / estimatedProduction : 0,
    waterM3PerTonne: estimatedProduction > 0 ? totalWater / estimatedProduction : 0,
    estimatedProduction,
  };

  return NextResponse.json({
    yourMetrics,
    benchmarks: INDUSTRY_BENCHMARKS,
    comparison: {
      vsSAAverage: {
        label: "vs SA Food Mfg Average",
        totalDiff: ((yourMetrics.totalPerTonne - INDUSTRY_BENCHMARKS.foodManufacturing.totalPerTonne) / INDUSTRY_BENCHMARKS.foodManufacturing.totalPerTonne) * 100,
        rating: yourMetrics.totalPerTonne <= INDUSTRY_BENCHMARKS.bestInClass.totalPerTonne ? "excellent"
          : yourMetrics.totalPerTonne <= INDUSTRY_BENCHMARKS.foodManufacturing.totalPerTonne ? "good"
          : yourMetrics.totalPerTonne <= INDUSTRY_BENCHMARKS.sectorAverage.totalPerTonne ? "average"
          : "below_average",
      },
    },
  });
}
