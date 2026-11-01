import React from "react";
import { Award, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

interface HarvestQualityBadgeProps {
  grade?: string;
  size?: "sm" | "md";
}

export function HarvestQualityBadge({
  grade = "Standard",
  size = "md",
}: HarvestQualityBadgeProps) {
  const normalized = (grade || "not specified").trim().toLowerCase();

  const config = (() => {
    if (normalized.includes("grade a") || normalized === "a" || normalized.includes("premium")) {
      return {
        label: grade || "Grade A",
        icon: Award,
        classes: "bg-emerald-50 text-emerald-800 border-emerald-200",
        dot: "bg-emerald-500",
      };
    }
    if (normalized.includes("grade b") || normalized === "b") {
      return {
        label: grade || "Grade B",
        icon: CheckCircle2,
        classes: "bg-blue-50 text-blue-800 border-blue-200",
        dot: "bg-blue-500",
      };
    }
    if (normalized.includes("grade c") || normalized === "c") {
      return {
        label: grade || "Grade C",
        icon: AlertTriangle,
        classes: "bg-amber-50 text-amber-800 border-amber-200",
        dot: "bg-amber-500",
      };
    }
    if (normalized.includes("standard")) {
      return {
        label: grade || "Standard",
        icon: CheckCircle2,
        classes: "bg-teal-50 text-teal-800 border-teal-200",
        dot: "bg-teal-500",
      };
    }
    if (normalized.includes("rejected")) {
      return {
        label: grade || "Rejected",
        icon: XCircle,
        classes: "bg-rose-50 text-rose-800 border-rose-200",
        dot: "bg-rose-500",
      };
    }
    return {
      label: grade || "Not specified",
      icon: HelpCircle,
      classes: "bg-earth-100 text-earth-700 border-earth-300",
      dot: "bg-earth-400",
    };
  })();

  const Icon = config.icon;
  const paddingClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs font-medium";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border shadow-2xs ${paddingClass} ${config.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </span>
  );
}
