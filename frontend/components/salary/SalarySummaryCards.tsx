"use client";

import React from "react";
import { SalarySummary } from "@/types";
import { Card } from "@/components/ui";
import {
  IndianRupee,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowUpRight,
} from "lucide-react";

interface SalarySummaryCardsProps {
  summary: SalarySummary | null;
  isLoading?: boolean;
}

export function SalarySummaryCards({
  summary,
  isLoading = false,
}: SalarySummaryCardsProps) {
  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val ?? 0);
  };

  const cards = [
    {
      title: "Total Payable",
      value: formatCurrency(summary?.total_salary_payable),
      subtext: `${summary?.total_records_count ?? 0} total salary ledgers`,
      icon: IndianRupee,
      color: "text-earth-800",
      bg: "bg-earth-50",
      border: "border-earth-200",
      badgeColor: "bg-earth-100 text-earth-800",
    },
    {
      title: "Disbursed (Paid)",
      value: formatCurrency(summary?.total_amount_paid),
      subtext: `${summary?.paid_records_count ?? 0} settled ledgers`,
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50/70",
      border: "border-emerald-200",
      badgeColor: "bg-emerald-100 text-emerald-800",
    },
    {
      title: "Balance Outstanding",
      value: formatCurrency(summary?.total_outstanding_balance),
      subtext: `${summary?.unpaid_records_count ?? 0} unpaid · ${summary?.partially_paid_records_count ?? 0} partial`,
      icon: AlertCircle,
      color: "text-amber-700",
      bg: "bg-amber-50/70",
      border: "border-amber-200",
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      title: "Payroll Settled",
      value: summary?.paid_records_count ?? 0,
      subtext: "Fully paid workers",
      icon: Layers,
      color: "text-sky-700",
      bg: "bg-sky-50/70",
      border: "border-sky-200",
      badgeColor: "bg-sky-100 text-sky-800",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <Card
            key={idx}
            className={`p-4 border transition-all duration-200 hover:shadow-xs ${card.bg} ${card.border}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-earth-600">{card.title}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  {isLoading ? (
                    <div className="h-7 w-24 bg-earth-200/60 rounded-sm animate-pulse" />
                  ) : (
                    <span className={`text-2xl font-bold tracking-tight ${card.color}`}>
                      {card.value}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-earth-500 font-normal">{card.subtext}</p>
              </div>
              <div className={`p-2.5 rounded-lg bg-white/80 shadow-2xs border border-earth-100`}>
                <IconComponent className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
