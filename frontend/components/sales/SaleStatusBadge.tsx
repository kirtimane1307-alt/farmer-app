import React from "react";
import { SalePaymentStatus } from "@/types";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface SaleStatusBadgeProps {
  status: SalePaymentStatus | string;
  size?: "sm" | "md";
}

export function SaleStatusBadge({
  status,
  size = "md",
}: SaleStatusBadgeProps) {
  const norm = (status || "").toLowerCase().trim();

  let label = "Unpaid";
  let bgClass = "bg-rose-50";
  let textClass = "text-rose-700";
  let borderClass = "border-rose-200";
  let Icon = AlertCircle;

  if (norm === "paid") {
    label = "Fully Paid";
    bgClass = "bg-emerald-50";
    textClass = "text-emerald-700";
    borderClass = "border-emerald-200";
    Icon = CheckCircle2;
  } else if (norm === "partially_paid") {
    label = "Partially Paid";
    bgClass = "bg-amber-50";
    textClass = "text-amber-700";
    borderClass = "border-amber-200";
    Icon = Clock;
  }

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1 font-medium"
      : "text-xs px-2.5 py-1 gap-1.5 font-semibold";

  return (
    <span
      className={`inline-flex items-center rounded-full border ${bgClass} ${textClass} ${borderClass} ${sizeClasses} shadow-2xs font-mono`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{label}</span>
    </span>
  );
}

export default SaleStatusBadge;
