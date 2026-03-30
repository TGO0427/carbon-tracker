"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";

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
  delta?: { value: number; label: string } | null;
}

function Sparkline({ data, color = "#22c55e" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 22;
  const w = 56;
  const step = w / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h}>
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
  delta,
}: KpiCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        {icon && (
          <div className={cn("mb-2 inline-flex rounded-lg p-2", iconBgColor)}>
            <div className={cn(iconColor)}>{icon}</div>
          </div>
        )}
        {sparklineData && sparklineData.length >= 2 ? (
          <Sparkline data={sparklineData} color={sparklineColor} />
        ) : href ? (
          <ArrowUpRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-emerald-500 transition-colors" />
        ) : null}
      </div>
      <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      {(subtitle || delta) && (
        <div className="mt-1 flex items-center gap-2">
          {subtitle && <p className="text-[11px] text-gray-400">{subtitle}</p>}
          {delta && delta.value !== 0 && (
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
              delta.value < 0 ? "text-emerald-600" : "text-red-500"
            }`}>
              {delta.value < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
              {delta.value > 0 ? "+" : ""}{delta.value.toFixed(1)}% {delta.label}
            </span>
          )}
        </div>
      )}
    </>
  );

  const cardClass = "rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm hover:shadow-md transition-all";

  if (href) {
    return (
      <Link href={href} className={cn("group block cursor-pointer hover:border-emerald-200", cardClass)}>
        {content}
      </Link>
    );
  }

  return <div className={cardClass}>{content}</div>;
}
