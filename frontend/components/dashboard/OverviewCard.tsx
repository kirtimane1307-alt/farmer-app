import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OverviewMetricItem {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: React.ReactNode;
}

export interface OverviewCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  metrics?: OverviewMetricItem[];
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function OverviewCard({
  title,
  description,
  icon: Icon,
  badge,
  metrics,
  action,
  children,
  className,
}: OverviewCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-earth-200 bg-white p-5 sm:p-6 shadow-2xs transition-all hover:shadow-md hover:border-earth-300 space-y-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="h-10 w-10 rounded-xl bg-farm-50 text-farm-700 border border-farm-200 flex items-center justify-center shrink-0 shadow-2xs">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-earth-900 tracking-tight">
                {title}
              </h3>
              {badge}
            </div>
            {description && (
              <p className="text-xs text-earth-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {metrics && metrics.length > 0 && (
        <div
          className={cn(
            "grid gap-3 pt-1",
            metrics.length === 2 && "grid-cols-2",
            metrics.length === 3 && "grid-cols-3",
            metrics.length >= 4 && "grid-cols-2 sm:grid-cols-4"
          )}
        >
          {metrics.map((item, index) => (
            <div
              key={index}
              className="p-3 rounded-xl bg-earth-50/80 border border-earth-100 flex flex-col justify-between"
            >
              <div className="text-[11px] text-earth-500 font-medium truncate">
                {item.label}
              </div>
              <div className="text-lg font-bold text-earth-900 mt-1">
                {item.value}
              </div>
              {item.subtext && (
                <div className="text-[10px] text-earth-400 mt-0.5">
                  {item.subtext}
                </div>
              )}
              {item.badge && <div className="mt-1.5">{item.badge}</div>}
            </div>
          ))}
        </div>
      )}

      {children && <div className="pt-1">{children}</div>}
    </div>
  );
}
