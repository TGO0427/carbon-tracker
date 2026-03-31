"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { OverviewTab } from "@/components/analytics/overview-tab";
import { ByCategoryTab } from "@/components/analytics/by-category-tab";
import { ByScopeTab } from "@/components/analytics/by-scope-tab";
import { SectorComparisonTab } from "@/components/analytics/sector-comparison-tab";
import { YearOverYearTab } from "@/components/analytics/year-over-year-tab";
import type { AnalyticsTab } from "@/types";

const tabs: { key: AnalyticsTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "by-category", label: "Emissions by Category" },
  { key: "by-scope", label: "Emissions by Scope" },
  { key: "sector-comparison", label: "Sector Comparison" },
  { key: "year-over-year", label: "Year over Year" },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Visualise and analyse your carbon emissions data</p>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "whitespace-nowrap border-b-2 pb-3 pt-1 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "by-category" && <ByCategoryTab />}
      {activeTab === "by-scope" && <ByScopeTab />}
      {activeTab === "sector-comparison" && <SectorComparisonTab />}
      {activeTab === "year-over-year" && <YearOverYearTab />}
    </div>
  );
}
