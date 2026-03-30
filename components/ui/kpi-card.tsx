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
  sparklineData?: number[];
  sparklineColor?: string;
}

function Sparkline({ data, color = "#22c55e" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 24;
  const w = 64;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="mt-1">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = "text-emerald-600",
  iconBgColor = "bg-emerald-50",
  href,
  sparklineData,
  sparklineColor,
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
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
        </div>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline data={sparklineData} color={sparklineColor} />
        )}
      </div>
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
        className="group block rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
      {content}
    </div>
  );
}
