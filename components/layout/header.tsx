"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Search, Bell, Home, ChevronRight } from "lucide-react";
import type { ReportingPeriod } from "@/types";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/emissions": "Emissions",
  "/emissions/new": "New Emission",
  "/calculator": "Calculator",
  "/logistics": "Logistics",
  "/logistics/new": "New Shipment",
  "/suppliers": "Suppliers",
  "/suppliers/new": "New Supplier",
  "/reports": "Reports",
  "/settings": "Settings",
  "/settings/emission-factors": "Emission Factors",
};

export function Header() {
  const pathname = usePathname();
  const [periods, setPeriods] = useState<ReportingPeriod[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<string>("");

  useEffect(() => {
    fetch("/api/reporting-periods")
      .then((res) => res.json())
      .then((data: ReportingPeriod[]) => {
        setPeriods(data);
        const active = data.find((p) => p.isActive);
        if (active) setActivePeriodId(active.id);
      })
      .catch(() => {});
  }, []);

  // Build breadcrumbs
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((_, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    return { label: pageTitles[path] || segments[i], path };
  });

  const currentTitle = pageTitles[pathname] || segments[segments.length - 1] || "Dashboard";

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-1.5 text-sm">
        <Home className="h-4 w-4 text-gray-400" />
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.path} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            <span className={i === breadcrumbs.length - 1 ? "font-medium text-gray-900" : "text-gray-500"}>
              {crumb.label}
            </span>
          </span>
        ))}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <button className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 transition-colors">
          <Search className="h-4 w-4" />
          <span>Search...</span>
          <kbd className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">&#8984;K</kbd>
        </button>

        {/* Period Selector */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
          <span className="text-xs text-gray-400">Period</span>
          <select
            value={activePeriodId}
            onChange={(e) => setActivePeriodId(e.target.value)}
            className="border-none bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
            A
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-gray-900">Admin User</p>
            <p className="text-xs text-gray-400">admin@synercore.co.za</p>
          </div>
        </div>
      </div>
    </header>
  );
}
