"use client";

import { useEffect, useState } from "react";
import { Flame, Zap, Globe } from "lucide-react";
import { useDateFilter } from "@/lib/date-filter-context";
import { SCOPE_CHART_COLORS, ACTIVITY_BAR_COLORS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ScopeBreakdown, CategoryBreakdown } from "@/types";

const SCOPE_META: Record<
  number,
  { label: string; subtitle: string; icon: React.ReactNode }
> = {
  1: {
    label: "Scope 1 - Direct",
    subtitle: "Owned / controlled sources",
    icon: <Flame className="h-5 w-5" />,
  },
  2: {
    label: "Scope 2 - Energy",
    subtitle: "Purchased electricity & heat",
    icon: <Zap className="h-5 w-5" />,
  },
  3: {
    label: "Scope 3 - Indirect",
    subtitle: "Value-chain emissions",
    icon: <Globe className="h-5 w-5" />,
  },
};

export function ByScopeTab() {
  const [byScope, setByScope] = useState<ScopeBreakdown[]>([]);
  const [byCategory, setByCategory] = useState<CategoryBreakdown[]>([]);
  const { buildQuery } = useDateFilter();

  useEffect(() => {
    const q = buildQuery();
    fetch(`/api/dashboard/by-scope?${q}`)
      .then((r) => r.json())
      .then(setByScope)
      .catch(() => {});
    fetch(`/api/dashboard/by-category?${q}`)
      .then((r) => r.json())
      .then(setByCategory)
      .catch(() => {});
  }, [buildQuery]);

  const grandTotal = byScope.reduce((sum, s) => sum + s.total, 0);

  // Build per-scope category data
  const scopeCategoryData = [1, 2, 3].map((scope) => {
    const categories = byCategory.filter((c) => c.scope === scope);
    const scopeTotal = categories.reduce((sum, c) => sum + c.total, 0);
    return {
      scope,
      scopeTotal,
      categories: categories
        .sort((a, b) => b.total - a.total)
        .map((cat) => ({
          name: cat.category,
          value: cat.total,
          pct: scopeTotal > 0 ? (cat.total / scopeTotal) * 100 : 0,
        })),
    };
  });

  // Build data for the comparison stacked bar chart
  // Each bar represents a scope, stacked by category
  const allCategoryNames = Array.from(
    new Set(byCategory.map((c) => c.category))
  );
  const comparisonData = [1, 2, 3].map((scope) => {
    const row: Record<string, string | number> = {
      name: `Scope ${scope}`,
    };
    const categories = byCategory.filter((c) => c.scope === scope);
    for (const catName of allCategoryNames) {
      const found = categories.find((c) => c.category === catName);
      row[catName] = found ? found.total : 0;
    }
    return row;
  });

  return (
    <div className="space-y-6">
      {/* Three Scope Cards */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {scopeCategoryData.map(({ scope, scopeTotal, categories }) => {
          const meta = SCOPE_META[scope];
          const pctOfTotal =
            grandTotal > 0 ? (scopeTotal / grandTotal) * 100 : 0;
          const accentColor = SCOPE_CHART_COLORS[scope];

          return (
            <div
              key={scope}
              className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden"
            >
              {/* Accent top bar */}
              <div className="h-1" style={{ backgroundColor: accentColor }} />

              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${accentColor}18` }}
                    >
                      <div style={{ color: accentColor }}>{meta.icon}</div>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {meta.label}
                      </h3>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        {meta.subtitle}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total + percentage */}
                <div className="flex items-baseline gap-2 mb-5">
                  <span className="text-2xl font-extrabold text-gray-900 dark:text-white">
                    {formatNumber(scopeTotal)}
                  </span>
                  <span className="text-xs font-medium text-gray-400">
                    tCO2e
                  </span>
                  <span
                    className="ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    {pctOfTotal.toFixed(1)}%
                  </span>
                </div>

                {/* Category breakdown bars */}
                {categories.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Category Breakdown
                    </p>
                    {categories.map((cat, idx) => (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium capitalize text-gray-700 dark:text-gray-300">
                            {cat.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-900 dark:text-white">
                              {formatNumber(cat.value, 2)}
                            </span>
                            <span className="text-[10px] text-gray-400 w-10 text-right">
                              {cat.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                          <div
                            className="h-2.5 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(cat.pct, 1)}%`,
                              backgroundColor:
                                ACTIVITY_BAR_COLORS[
                                  idx % ACTIVITY_BAR_COLORS.length
                                ],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center">
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      No data for this scope
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Stacked Bar Chart */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5">
        <div className="mb-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Scope Comparison by Category
          </h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            Stacked breakdown showing category contributions within each scope
          </p>
        </div>

        {byCategory.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={comparisonData}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={{ stroke: "#e5e7eb" }}
                tickFormatter={(v: number) =>
                  v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                }
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
                }}
                formatter={(value) => `${formatNumber(Number(value), 2)} tCO2e`}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value: string) =>
                  value.charAt(0).toUpperCase() + value.slice(1)
                }
              />
              {allCategoryNames.map((catName, idx) => (
                <Bar
                  key={catName}
                  dataKey={catName}
                  stackId="a"
                  name={catName}
                  radius={
                    idx === allCategoryNames.length - 1
                      ? [4, 4, 0, 0]
                      : [0, 0, 0, 0]
                  }
                  barSize={64}
                >
                  {comparisonData.map((entry, i) => (
                    <Cell
                      key={`${catName}-${i}`}
                      fill={
                        ACTIVITY_BAR_COLORS[idx % ACTIVITY_BAR_COLORS.length]
                      }
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[320px] items-center justify-center text-sm text-gray-400 dark:text-gray-500">
            No category data available. Add emissions to see the comparison.
          </div>
        )}
      </div>

      {/* Summary Table */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Detailed Breakdown
          </h3>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            All categories by scope with absolute and relative values
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Scope
                </th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Category
                </th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Emissions (tCO2e)
                </th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  % of Scope
                </th>
                <th className="px-5 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody>
              {scopeCategoryData.map(({ scope, scopeTotal, categories }) =>
                categories.length > 0 ? (
                  categories.map((cat, idx) => (
                    <tr
                      key={`${scope}-${cat.name}`}
                      className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="px-5 py-2.5">
                        {idx === 0 ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{
                                backgroundColor: SCOPE_CHART_COLORS[scope],
                              }}
                            />
                            <span className="font-medium text-gray-900 dark:text-white">
                              Scope {scope}
                            </span>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-2.5 capitalize text-gray-600 dark:text-gray-300">
                        {cat.name}
                      </td>
                      <td className="px-5 py-2.5 text-right font-medium text-gray-900 dark:text-white">
                        {formatNumber(cat.value, 2)}
                      </td>
                      <td className="px-5 py-2.5 text-right text-gray-500 dark:text-gray-400">
                        {cat.pct.toFixed(1)}%
                      </td>
                      <td className="px-5 py-2.5 text-right text-gray-500 dark:text-gray-400">
                        {grandTotal > 0
                          ? ((cat.value / grandTotal) * 100).toFixed(1)
                          : "0.0"}
                        %
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr
                    key={`${scope}-empty`}
                    className="border-b border-gray-50 dark:border-gray-700/50"
                  >
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{
                            backgroundColor: SCOPE_CHART_COLORS[scope],
                          }}
                        />
                        <span className="font-medium text-gray-900 dark:text-white">
                          Scope {scope}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-5 py-2.5 text-gray-400 dark:text-gray-500 italic"
                      colSpan={4}
                    >
                      No data
                    </td>
                  </tr>
                )
              )}
              {/* Grand total row */}
              <tr className="bg-gray-50 dark:bg-gray-800/50 font-semibold">
                <td className="px-5 py-3 text-gray-900 dark:text-white">
                  Total
                </td>
                <td className="px-5 py-3" />
                <td className="px-5 py-3 text-right text-gray-900 dark:text-white">
                  {formatNumber(grandTotal, 2)}
                </td>
                <td className="px-5 py-3" />
                <td className="px-5 py-3 text-right text-gray-900 dark:text-white">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
