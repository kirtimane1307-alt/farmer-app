"use client";

import React from "react";
import { ApplicationCategory } from "@/types";
import { FlaskConical, Bug } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApplicationCategoryBadgeProps {
  category: ApplicationCategory | string;
  size?: "sm" | "md";
  className?: string;
  showIcon?: boolean;
}

export function ApplicationCategoryBadge({
  category,
  size = "md",
  className,
  showIcon = true,
}: ApplicationCategoryBadgeProps) {
  const normalized = (category || "").toLowerCase();

  const isFertilizer = normalized === "fertilizer";
  const label = isFertilizer ? "Fertilizer" : "Pesticide";
  const Icon = isFertilizer ? FlaskConical : Bug;

  const variantStyles = isFertilizer
    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
    : "bg-amber-50 text-amber-800 border-amber-200";

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
