"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  href?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "text-emerald-600",
  iconBgColor = "bg-emerald-50",
  href,
}: KpiCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        {icon && (
          <div className={cn("mb-3 inline-flex rounded-lg p-2.5", iconBgColor)}>
            <div className={cn(iconColor)}>{icon}</div>
          </div>
        )}
        {href && (
          <ArrowUpRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
      {href && (
        <p className="mt-2 text-[11px] font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
          View details &rarr;
        </p>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group block rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      {content}
    </div>
  );
}
