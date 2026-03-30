"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Flame, Calculator, Truck, Users,
  FileText, Settings, Leaf, ChevronDown, ChevronLeft,
  ChevronRight, Search, Plus, BarChart3, MapPin, Upload,
} from "lucide-react";
import { useState } from "react";
import { useDateFilter } from "@/lib/date-filter-context";
import { MONTHS, SITES } from "@/lib/constants";

interface NavSection {
  label: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const sections: NavSection[] = [
  {
    label: "MAIN",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "DATA",
    items: [
      { href: "/emissions", label: "Company Emissions", icon: Flame },
      { href: "/sites", label: "Sites", icon: MapPin },
      { href: "/suppliers", label: "Suppliers", icon: Users },
      { href: "/imports", label: "Import Data", icon: Upload },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "ACTIONS",
    items: [
      { href: "/logistics", label: "Logistics", icon: Truck },
      { href: "/calculator", label: "Calculator", icon: Calculator },
    ],
  },
  {
    label: "EXPORT",
    items: [
      { href: "/reports", label: "Export Reports", icon: FileText },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { selectedYear, selectedMonth, selectedSiteId, setSelectedYear, setSelectedMonth, setSelectedSiteId } = useDateFilter();

  const toggleSection = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="flex h-screen w-60 flex-col bg-[#064e3b] text-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Leaf className="h-7 w-7 text-emerald-300" />
        <span className="text-lg font-bold tracking-wide">Carbon Tracker</span>
      </div>

      {/* Year / Month Selector */}
      <div className="px-3 pb-3">
        <div className="rounded-lg bg-white/10 p-3">
          <div className="mb-2 flex items-center justify-between">
            <button onClick={() => setSelectedYear(selectedYear - 1)} className="rounded p-0.5 hover:bg-white/10">
              <ChevronLeft className="h-4 w-4 text-white/60" />
            </button>
            <span className="text-sm font-semibold text-white">{selectedYear}</span>
            <button onClick={() => setSelectedYear(selectedYear + 1)} className="rounded p-0.5 hover:bg-white/10">
              <ChevronRight className="h-4 w-4 text-white/60" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <button
              onClick={() => setSelectedMonth(null)}
              className={cn(
                "col-span-4 mb-1 rounded px-1.5 py-1 text-[11px] font-medium transition-colors",
                selectedMonth === null
                  ? "bg-emerald-500 text-white"
                  : "text-white/50 hover:bg-white/10 hover:text-white/80"
              )}
            >
              All Months
            </button>
            {MONTHS.map((m) => (
              <button
                key={m.value}
                onClick={() => setSelectedMonth(m.value)}
                className={cn(
                  "rounded px-1.5 py-1 text-[11px] font-medium transition-colors",
                  selectedMonth === m.value
                    ? "bg-emerald-500 text-white"
                    : "text-white/50 hover:bg-white/10 hover:text-white/80"
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Site Filter - hidden on the Sites page since it has its own drill-down */}
      {!pathname.startsWith("/sites") && (
        <div className="px-3 pb-3">
          <div className="rounded-lg bg-white/10 p-3">
            <p className="mb-2 text-[11px] font-semibold tracking-wider text-white/40">SITE</p>
            <button
              onClick={() => setSelectedSiteId(null)}
              className={cn(
                "mb-1 w-full rounded px-2 py-1.5 text-left text-xs font-medium transition-colors",
                selectedSiteId === null
                  ? "bg-emerald-500 text-white"
                  : "text-white/50 hover:bg-white/10 hover:text-white/80"
              )}
            >
              All Sites
            </button>
            {SITES.map((site) => (
              <button
                key={site.id}
                onClick={() => setSelectedSiteId(site.id)}
                className={cn(
                  "w-full rounded px-2 py-1.5 text-left text-xs font-medium transition-colors",
                  selectedSiteId === site.id
                    ? "bg-emerald-500 text-white"
                    : "text-white/50 hover:bg-white/10 hover:text-white/80"
                )}
              >
                {site.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-1.5 px-3 pb-4">
        <Link
          href="/emissions/new"
          className="flex items-center gap-1 rounded-md bg-emerald-500/20 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
        >
          <Plus className="h-3 w-3" /> Emission
        </Link>
        <Link
          href="/logistics/new"
          className="flex items-center gap-1 rounded-md bg-emerald-500/20 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
        >
          <Plus className="h-3 w-3" /> Shipment
        </Link>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {sections.map((section) => (
          <div key={section.label}>
            <button
              onClick={() => toggleSection(section.label)}
              className="flex w-full items-center justify-between px-2 py-2 text-[11px] font-semibold tracking-wider text-white/40 hover:text-white/60 transition-colors"
            >
              {section.label}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  collapsed[section.label] && "-rotate-90"
                )}
              />
            </button>
            {!collapsed[section.label] && (
              <div className="space-y-0.5 pb-2">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-emerald-400/15 text-emerald-300 border-l-[3px] border-emerald-400 -ml-px"
                          : "text-white/60 hover:bg-white/5 hover:text-white/90"
                      )}
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <p className="text-[11px] text-white/30">GHG Protocol Compliant</p>
        <p className="text-[11px] text-white/20">Synercore Holdings</p>
      </div>
    </aside>
  );
}
