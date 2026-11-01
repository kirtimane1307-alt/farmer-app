import * as React from "react";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: {
    value: number;
    period?: string;
    isPositiveGood?: boolean;
  };
  icon: LucideIcon;
  iconColor?: "farm" | "harvest" | "blue" | "purple" | "rose";
  className?: string;
}

export function StatCard({
  title,
  value,
  unit,
  change,
  icon: Icon,
  iconColor = "farm",
  className,
}: StatCardProps) {
  const colorStyles = {
    farm: "bg-farm-50 text-farm-700 border-farm-200",
    harvest: "bg-amber-50 text-amber-700 border-amber-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const isPositive = change ? change.value > 0 : false;
  const isNeutral = change ? change.value === 0 : true;
  const isGood = change?.isPositiveGood !== undefined ? (isPositive ? change.isPositiveGood : !change.isPositiveGood) : isPositive;

  return (
    <div
      className={cn(
        "rounded-2xl border border-earth-200 bg-white p-5 shadow-2xs transition-all hover:shadow-md hover:border-earth-300",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-earth-500 uppercase tracking-wider">
          {title}
        </span>
        <div
          className={cn(
            "h-9 w-9 rounded-xl border flex items-center justify-center shadow-xs",
            colorStyles[iconColor]
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-earth-900">
          {value}
        </span>
        {unit && <span className="text-xs font-medium text-earth-500">{unit}</span>}
      </div>

      {change && (
        <div className="mt-2.5 flex items-center text-xs space-x-1.5">
          <span
            className={cn(
              "inline-flex items-center font-semibold rounded px-1.5 py-0.5 text-[11px]",
              isNeutral
                ? "text-earth-600 bg-earth-100"
                : isGood
                ? "text-farm-700 bg-farm-50"
                : "text-red-700 bg-red-50"
            )}
          >
            {isNeutral ? (
              <Minus className="h-3 w-3 mr-0.5" />
            ) : isPositive ? (
              <TrendingUp className="h-3 w-3 mr-0.5" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-0.5" />
            )}
            {change.value > 0 ? `+${change.value}%` : `${change.value}%`}
          </span>
          <span className="text-earth-400 text-[11px]">
            {change.period || "vs last month"}
          </span>
        </div>
      )}
    </div>
  );
}
