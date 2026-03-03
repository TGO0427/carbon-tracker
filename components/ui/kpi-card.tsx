"use client";

import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "text-emerald-600",
  iconBgColor = "bg-emerald-50",
}: KpiCardProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      {icon && (
        <div className={cn("mb-3 inline-flex rounded-lg p-2.5", iconBgColor)}>
          <div className={cn(iconColor)}>{icon}</div>
        </div>
      )}
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
    </div>
  );
}
