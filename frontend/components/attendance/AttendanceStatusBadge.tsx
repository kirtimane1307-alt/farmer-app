"use client";

import React from "react";
import { AttendanceStatus } from "@/types";
import { CheckCircle2, XCircle, Clock, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus | string;
  size?: "sm" | "md";
  className?: string;
  showIcon?: boolean;
}

export function AttendanceStatusBadge({
  status,
  size = "md",
  className,
  showIcon = true,
}: AttendanceStatusBadgeProps) {
  const normalized = (status || "").toLowerCase().replace(/[\s-]/g, "_");

  let label = "Present";
  let variantStyles = "bg-emerald-50 text-emerald-800 border-emerald-200";
  let Icon = CheckCircle2;

  switch (normalized) {
    case "present":
      label = "Present";
      variantStyles = "bg-emerald-50 text-emerald-800 border-emerald-200";
      Icon = CheckCircle2;
      break;
    case "absent":
      label = "Absent";
      variantStyles = "bg-red-50 text-red-800 border-red-200";
      Icon = XCircle;
      break;
    case "half_day":
    case "halfday":
      label = "Half Day";
      variantStyles = "bg-amber-50 text-amber-800 border-amber-200";
      Icon = Clock;
      break;
    case "leave":
      label = "On Leave";
      variantStyles = "bg-indigo-50 text-indigo-800 border-indigo-200";
      Icon = CalendarOff;
      break;
    default:
      label = status;
      variantStyles = "bg-earth-100 text-earth-800 border-earth-200";
      Icon = CheckCircle2;
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
        "inline-flex items-center font-medium rounded-full border transition-colors",
        variantStyles,
        sizeStyles[size],
        className
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[size], "shrink-0")} />}
      <span>{label}</span>
    </span>
  );
}
