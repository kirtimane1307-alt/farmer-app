"use client";

import React from "react";
import { SalaryStatus } from "@/types";
import { CheckCircle2, AlertCircle, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface SalaryStatusBadgeProps {
  status: SalaryStatus | string;
  size?: "sm" | "md";
  className?: string;
  showIcon?: boolean;
}

export function SalaryStatusBadge({
  status,
  size = "md",
  className,
  showIcon = true,
}: SalaryStatusBadgeProps) {
  const normalized = (status || "").toLowerCase().replace(/[\s-]/g, "_");

  let label = "Generated";
  let variantStyles = "bg-amber-50 text-amber-800 border-amber-200";
  let Icon = Clock;

  switch (normalized) {
    case "paid":
      label = "Fully Paid";
      variantStyles = "bg-emerald-50 text-emerald-800 border-emerald-200";
      Icon = CheckCircle2;
      break;
    case "partially_paid":
      label = "Partially Paid";
      variantStyles = "bg-sky-50 text-sky-800 border-sky-200";
      Icon = AlertCircle;
      break;
    case "draft":
      label = "Draft";
      variantStyles = "bg-earth-100 text-earth-700 border-earth-300";
      Icon = FileText;
      break;
    case "generated":
    default:
      label = "Unpaid";
      variantStyles = "bg-amber-50 text-amber-800 border-amber-200";
      Icon = Clock;
      break;
  }

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px] gap-1",
    md: "px-2.5 py-0.5 text-xs gap-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full border shadow-2xs transition-colors",
        sizeStyles[size],
        variantStyles,
        className
      )}
    >
      {showIcon && <Icon className={cn("shrink-0", iconSizes[size])} />}
      <span>{label}</span>
    </span>
  );
}
