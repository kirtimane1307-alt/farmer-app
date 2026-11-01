import * as React from "react";
import { cn } from "@/lib/utils";

export interface SectionCardProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  title,
  description,
  badge,
  action,
  children,
  className,
}: SectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-earth-200 bg-white shadow-2xs overflow-hidden",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6 border-b border-earth-100">
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
        {action && <div>{action}</div>}
      </div>

      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}
