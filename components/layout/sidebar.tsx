"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Flame,
  Calculator,
  Truck,
  Users,
  FileText,
  Settings,
  Leaf,
  ChevronDown,
  Search,
  Plus,
} from "lucide-react";
import { useState } from "react";

interface NavSection {
  label: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

const sections: NavSection[] = [
  {
    label: "OVERVIEW",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "EMISSIONS",
    items: [
      { href: "/emissions", label: "Emission Sources", icon: Flame },
      { href: "/calculator", label: "Calculator", icon: Calculator },
    ],
  },
  {
    label: "LOGISTICS",
    items: [
      { href: "/logistics", label: "Shipments", icon: Truck },
      { href: "/suppliers", label: "Suppliers & Buyers", icon: Users },
    ],
  },
  {
    label: "REPORTS",
    items: [
      { href: "/reports", label: "Export Reports", icon: FileText },
    ],
  },
  {
    label: "CONFIGURATION",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleSection = (label: string) => {
    setCollapsed((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="flex h-screen w-60 flex-col bg-[#0f1b2d] text-white">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Leaf className="h-7 w-7 text-emerald-400" />
        <span className="text-lg font-bold tracking-wide">Carbon Tracker</span>
      </div>

      {/* Search */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-sm text-white/50">
          <Search className="h-4 w-4" />
          <span>Search... ( / )</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-1.5 px-3 pb-4">
        <Link
          href="/emissions/new"
          className="flex items-center gap-1 rounded-md bg-emerald-600/20 px-2.5 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-600/30 transition-colors"
        >
          <Plus className="h-3 w-3" /> Emission
        </Link>
        <Link
          href="/logistics/new"
          className="flex items-center gap-1 rounded-md bg-blue-600/20 px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-600/30 transition-colors"
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
                          ? "bg-emerald-500/15 text-emerald-400 border-l-[3px] border-emerald-400 -ml-px"
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
