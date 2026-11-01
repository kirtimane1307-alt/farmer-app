import React from "react";
import {
  Calendar,
  Tractor,
  Wheat,
  Sprout,
  FlaskConical,
  Bug,
  Droplets,
  Scissors,
  Eye,
  Users,
  Package,
  Wrench,
  TrendingUp,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import { CalendarActivityType } from "@/types";

interface ActivityTypeBadgeProps {
  activityType: CalendarActivityType | string;
  className?: string;
  showIcon?: boolean;
}

export const ACTIVITY_TYPE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  general_task: {
    label: "General Task",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    icon: CheckSquare,
  },
  land_preparation: {
    label: "Land Prep",
    bg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: Tractor,
  },
  sowing: {
    label: "Sowing",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: Sprout,
  },
  transplanting: {
    label: "Transplanting",
    bg: "bg-lime-50",
    text: "text-lime-800",
    border: "border-lime-200",
    icon: Sprout,
  },
  fertilizer_application: {
    label: "Fertilizer",
    bg: "bg-blue-50",
    text: "text-blue-800",
    border: "border-blue-200",
    icon: FlaskConical,
  },
  pesticide_application: {
    label: "Pesticide",
    bg: "bg-purple-50",
    text: "text-purple-800",
    border: "border-purple-200",
    icon: Bug,
  },
  irrigation: {
    label: "Irrigation",
    bg: "bg-sky-50",
    text: "text-sky-800",
    border: "border-sky-200",
    icon: Droplets,
  },
  weeding: {
    label: "Weeding",
    bg: "bg-orange-50",
    text: "text-orange-800",
    border: "border-orange-200",
    icon: Scissors,
  },
  pruning: {
    label: "Pruning",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    icon: Scissors,
  },
  crop_inspection: {
    label: "Crop Inspection",
    bg: "bg-indigo-50",
    text: "text-indigo-800",
    border: "border-indigo-200",
    icon: Eye,
  },
  labour_assignment: {
    label: "Labour Task",
    bg: "bg-violet-50",
    text: "text-violet-800",
    border: "border-violet-200",
    icon: Users,
  },
  harvesting: {
    label: "Harvesting",
    bg: "bg-amber-100",
    text: "text-amber-900",
    border: "border-amber-300",
    icon: Package,
  },
  equipment_maintenance: {
    label: "Equipment Maint.",
    bg: "bg-zinc-100",
    text: "text-zinc-800",
    border: "border-zinc-300",
    icon: Wrench,
  },
  sales_appointment: {
    label: "Sales / Delivery",
    bg: "bg-teal-50",
    text: "text-teal-800",
    border: "border-teal-200",
    icon: TrendingUp,
  },
  other: {
    label: "Other Activity",
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-300",
    icon: Calendar,
  },
};

export function ActivityTypeBadge({
  activityType,
  className = "",
  showIcon = true,
}: ActivityTypeBadgeProps) {
  const config = ACTIVITY_TYPE_CONFIG[activityType] || {
    label: activityType.replace(/_/g, " "),
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-200",
    icon: Calendar,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showIcon && <Icon className="h-3.5 w-3.5 shrink-0" />}
      <span className="truncate">{config.label}</span>
    </span>
  );
}

export default ActivityTypeBadge;
