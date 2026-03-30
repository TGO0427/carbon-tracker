"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Bell, Home, ChevronRight, Calendar, Sun, Moon, AlertTriangle, Target, Upload } from "lucide-react";
import { useDateFilter } from "@/lib/date-filter-context";
import { useTheme } from "@/lib/theme-context";
import { MONTHS } from "@/lib/constants";
import { useState, useEffect, useRef } from "react";

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
  "/settings/audit-log": "Audit Log",
  "/analytics": "Analytics",
};

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  details: string | null;
  count: number | null;
  createdAt: string;
}

interface TargetEntry {
  id: string;
  year: number;
  scope: number | null;
  targetEmissions: number;
  actual: number;
  progress: number;
  onTrack: boolean;
  site?: { name: string } | null;
}

export function Header() {
  const pathname = usePathname();
  const { selectedYear, selectedMonth } = useDateFilter();
  const { dark, toggleDark } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const [missingCount, setMissingCount] = useState(0);
  const [overBudgetTargets, setOverBudgetTargets] = useState<TargetEntry[]>([]);
  const [recentImports, setRecentImports] = useState<AuditLogEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const monthLabel = selectedMonth
    ? MONTHS.find((m) => m.value === selectedMonth)?.label
    : "All Months";

  // Build breadcrumbs
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((_, i) => {
    const path = "/" + segments.slice(0, i + 1).join("/");
    return { label: pageTitles[path] || segments[i], path };
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [showDropdown]);

  // Fetch badge count on mount and periodically
  useEffect(() => {
    function fetchBadge() {
      Promise.all([
        fetch(`/api/dashboard/missing-data?year=${selectedYear}`).then((r) => r.json()),
        fetch(`/api/targets?year=${selectedYear}`).then((r) => r.json()),
      ])
        .then(([missingData, targets]) => {
          const missing = missingData.missingCount ?? 0;
          const overBudget = (targets as TargetEntry[]).filter((t) => !t.onTrack).length;
          setBadgeCount(missing + overBudget);
        })
        .catch(() => {});
    }
    fetchBadge();
    const interval = setInterval(fetchBadge, 60000);
    return () => clearInterval(interval);
  }, [selectedYear]);

  // Fetch notification data when dropdown opens
  useEffect(() => {
    if (!showDropdown) return;
    setLoaded(false);

    Promise.all([
      fetch(`/api/dashboard/missing-data?year=${selectedYear}`).then((r) => r.json()),
      fetch(`/api/targets?year=${selectedYear}`).then((r) => r.json()),
      fetch("/api/audit-log?limit=5").then((r) => r.json()),
    ])
      .then(([missingData, targets, logs]) => {
        setMissingCount(missingData.missingCount ?? 0);
        const overBudget = (targets as TargetEntry[]).filter((t) => !t.onTrack);
        setOverBudgetTargets(overBudget);
        setRecentImports(
          (logs as AuditLogEntry[]).filter((l) => l.action === "import").slice(0, 3)
        );
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [showDropdown, selectedYear]);

  const totalNotifications = missingCount + overBudgetTargets.length + recentImports.length;

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6">
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

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDark}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Date Context Badge */}
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <Calendar className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">{monthLabel} {selectedYear}</span>
        </div>

        {/* Notifications Bell with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {badgeCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full z-50 mt-2 w-96 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
              <div className="border-b border-gray-100 dark:border-gray-700 px-4 py-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
              </div>

              {!loaded ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                </div>
              ) : totalNotifications === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No notifications
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {/* Missing Data */}
                  {missingCount > 0 && (
                    <Link
                      href="/dashboard"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Missing Data</p>
                        <p className="text-xs text-gray-500">
                          {missingCount} data point{missingCount !== 1 ? "s" : ""} missing for {selectedYear}
                        </p>
                      </div>
                    </Link>
                  )}

                  {/* Targets Over Budget */}
                  {overBudgetTargets.length > 0 && (
                    <Link
                      href="/targets"
                      onClick={() => setShowDropdown(false)}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                        <Target className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Targets Over Budget</p>
                        <p className="text-xs text-gray-500">
                          {overBudgetTargets.length} target{overBudgetTargets.length !== 1 ? "s" : ""} exceeded for {selectedYear}
                        </p>
                      </div>
                    </Link>
                  )}

                  {/* Recent Imports */}
                  {recentImports.length > 0 && (
                    <>
                      <div className="border-t border-gray-100 dark:border-gray-700 px-4 pt-2 pb-1">
                        <p className="text-[11px] font-semibold tracking-wider text-gray-400">RECENT IMPORTS</p>
                      </div>
                      {recentImports.map((log) => (
                        <Link
                          key={log.id}
                          href="/settings/audit-log"
                          onClick={() => setShowDropdown(false)}
                          className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                            <Upload className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {log.details || `Imported ${log.count ?? 0} entries`}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(log.createdAt).toLocaleDateString()}{" "}
                              {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-2.5">
                <Link
                  href="/settings/audit-log"
                  onClick={() => setShowDropdown(false)}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  View all activity
                </Link>
              </div>
            </div>
          )}
        </div>

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
