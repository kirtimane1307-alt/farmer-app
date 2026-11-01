import React from "react";
import { EquipmentCondition } from "@/types";
import { Sparkles, Check, AlertTriangle, AlertOctagon, XCircle } from "lucide-react";

interface EquipmentConditionBadgeProps {
  condition: EquipmentCondition | string;
  size?: "sm" | "md";
}

export function EquipmentConditionBadge({
  condition,
  size = "md",
}: EquipmentConditionBadgeProps) {
  const normalized = (condition || "").toLowerCase();

  const config = {
    excellent: {
      label: "Excellent",
      icon: Sparkles,
      classes: "bg-teal-50 text-teal-700 border-teal-200",
    },
    good: {
      label: "Good",
      icon: Check,
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    fair: {
      label: "Fair",
      icon: AlertTriangle,
      classes: "bg-amber-50 text-amber-700 border-amber-200",
    },
    poor: {
      label: "Poor",
      icon: AlertOctagon,
      classes: "bg-orange-50 text-orange-700 border-orange-200",
    },
    damaged: {
      label: "Damaged",
      icon: XCircle,
      classes: "bg-rose-50 text-rose-700 border-rose-200",
    },
  }[normalized] || {
    label: condition,
    icon: Check,
    classes: "bg-earth-100 text-earth-700 border-earth-300",
  };

  const Icon = config.icon;
  const paddingClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.5 text-xs font-medium";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${paddingClass} ${config.classes}`}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </span>
  );
}
