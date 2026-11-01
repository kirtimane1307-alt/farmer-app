import React from "react";
import { EquipmentStatus } from "@/types";
import { CheckCircle2, PlayCircle, Wrench, Archive } from "lucide-react";

interface EquipmentStatusBadgeProps {
  status: EquipmentStatus | string;
  size?: "sm" | "md";
}

export function EquipmentStatusBadge({
  status,
  size = "md",
}: EquipmentStatusBadgeProps) {
  const normalized = (status || "").toLowerCase();

  const config = {
    available: {
      label: "Available",
      icon: CheckCircle2,
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dot: "bg-emerald-500",
    },
    in_use: {
      label: "In Use",
      icon: PlayCircle,
      classes: "bg-blue-50 text-blue-700 border-blue-200",
      dot: "bg-blue-500",
    },
    under_maintenance: {
      label: "Under Maintenance",
      icon: Wrench,
      classes: "bg-amber-50 text-amber-800 border-amber-200",
      dot: "bg-amber-500 animate-pulse",
    },
    retired: {
      label: "Retired",
      icon: Archive,
      classes: "bg-slate-100 text-slate-700 border-slate-300",
      dot: "bg-slate-400",
    },
  }[normalized] || {
    label: status,
    icon: CheckCircle2,
    classes: "bg-earth-100 text-earth-700 border-earth-300",
    dot: "bg-earth-400",
  };

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
