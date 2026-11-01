import React from "react";
import {
  Landmark,
  ShieldCheck,
  Wrench,
  Layers,
  Sparkles,
  Compass,
  GraduationCap,
  HelpCircle,
  Coins,
} from "lucide-react";

interface IncomeCategoryBadgeProps {
  category: string;
  categoryLabel?: string;
  size?: "sm" | "md";
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  government_subsidy: {
    label: "Government Subsidy",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: Landmark,
  },
  insurance_compensation: {
    label: "Insurance Compensation",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
    icon: ShieldCheck,
  },
  equipment_rental: {
    label: "Equipment Rental",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: Wrench,
  },
  land_lease: {
    label: "Land Lease",
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    icon: Layers,
  },
  scrap_byproduct: {
    label: "Scrap & By-product",
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
    icon: Sparkles,
  },
  agro_tourism: {
    label: "Agro-Tourism",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-200",
    icon: Compass,
  },
  consulting: {
    label: "Consulting & Training",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    icon: GraduationCap,
  },
  miscellaneous: {
    label: "Miscellaneous",
    bg: "bg-earth-100",
    text: "text-earth-700",
    border: "border-earth-200",
    icon: Coins,
  },
  other: {
    label: "Other Agricultural",
    bg: "bg-earth-100",
    text: "text-earth-700",
    border: "border-earth-200",
    icon: HelpCircle,
  },
};

export function IncomeCategoryBadge({
  category,
  categoryLabel,
  size = "md",
}: IncomeCategoryBadgeProps) {
  const norm = (category || "").toLowerCase().trim();
  const conf = CATEGORY_CONFIG[norm] || {
    label: categoryLabel || category.replace("_", " ").toUpperCase(),
    bg: "bg-earth-100",
    text: "text-earth-700",
    border: "border-earth-200",
    icon: Coins,
  };

  const Icon = conf.icon;
  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1 font-medium"
      : "text-xs px-2.5 py-1 gap-1.5 font-semibold";

  return (
    <span
      className={`inline-flex items-center rounded-full border ${conf.bg} ${conf.text} ${conf.border} ${sizeClasses} shadow-2xs`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{categoryLabel || conf.label}</span>
    </span>
  );
}

export default IncomeCategoryBadge;
