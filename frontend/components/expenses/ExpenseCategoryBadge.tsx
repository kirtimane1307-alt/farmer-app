import React from "react";
import { ExpenseCategory } from "@/types";
import {
  Users,
  FlaskConical,
  Bug,
  Sprout,
  Droplets,
  Fuel,
  Tractor,
  Wrench,
  Truck,
  Zap,
  Waves,
  Building2,
  Receipt,
  LucideIcon,
} from "lucide-react";

interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  labour: {
    label: "Labour",
    icon: Users,
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
  },
  fertilizer: {
    label: "Fertilizer",
    icon: FlaskConical,
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    borderClass: "border-emerald-200",
  },
  pesticide: {
    label: "Pesticide",
    icon: Bug,
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
  },
  seeds: {
    label: "Seeds",
    icon: Sprout,
    bgClass: "bg-lime-50",
    textClass: "text-lime-700",
    borderClass: "border-lime-200",
  },
  irrigation: {
    label: "Irrigation",
    icon: Droplets,
    bgClass: "bg-cyan-50",
    textClass: "text-cyan-700",
    borderClass: "border-cyan-200",
  },
  fuel: {
    label: "Fuel",
    icon: Fuel,
    bgClass: "bg-orange-50",
    textClass: "text-orange-700",
    borderClass: "border-orange-200",
  },
  equipment: {
    label: "Equipment",
    icon: Tractor,
    bgClass: "bg-indigo-50",
    textClass: "text-indigo-700",
    borderClass: "border-indigo-200",
  },
  maintenance_and_repairs: {
    label: "Maintenance & Repairs",
    icon: Wrench,
    bgClass: "bg-purple-50",
    textClass: "text-purple-700",
    borderClass: "border-purple-200",
  },
  transportation: {
    label: "Transportation",
    icon: Truck,
    bgClass: "bg-teal-50",
    textClass: "text-teal-700",
    borderClass: "border-teal-200",
  },
  electricity: {
    label: "Electricity",
    icon: Zap,
    bgClass: "bg-yellow-50",
    textClass: "text-yellow-700",
    borderClass: "border-yellow-200",
  },
  water: {
    label: "Water",
    icon: Waves,
    bgClass: "bg-sky-50",
    textClass: "text-sky-700",
    borderClass: "border-sky-200",
  },
  rent_and_leasing: {
    label: "Rent & Leasing",
    icon: Building2,
    bgClass: "bg-rose-50",
    textClass: "text-rose-700",
    borderClass: "border-rose-200",
  },
  other: {
    label: "Other Expense",
    icon: Receipt,
    bgClass: "bg-earth-100",
    textClass: "text-earth-700",
    borderClass: "border-earth-200",
  },
};

interface ExpenseCategoryBadgeProps {
  category: ExpenseCategory | string;
  size?: "sm" | "md";
}

export function ExpenseCategoryBadge({
  category,
  size = "md",
}: ExpenseCategoryBadgeProps) {
  const norm = category.toLowerCase().trim();
  const meta = CATEGORY_META[norm] || CATEGORY_META.other;
  const Icon = meta.icon;

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1 font-medium"
      : "text-xs px-2.5 py-1 gap-1.5 font-semibold";

  return (
    <span
      className={`inline-flex items-center rounded-full border ${meta.bgClass} ${meta.textClass} ${meta.borderClass} ${sizeClasses} transition-all`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{meta.label}</span>
    </span>
  );
}
