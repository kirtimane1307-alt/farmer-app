"use client";

import React from "react";
import { ApplicationSummary } from "@/types";
import { Card } from "@/components/ui";
import {
  FlaskConical,
  Bug,
  IndianRupee,
  Layers,
  Sparkles,
} from "lucide-react";

interface ApplicationSummaryCardsProps {
  summary: ApplicationSummary | null;
  isLoading?: boolean;
  categoryFilter?: string;
}

export function ApplicationSummaryCards({
  summary,
  isLoading = false,
  categoryFilter,
}: ApplicationSummaryCardsProps) {
  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val ?? 0);
  };

  const cards = [
    {
      title: "Fertilizer Applications",
      value: summary?.fertilizer_applications_count ?? 0,
      subtext: `Total: ${formatCurrency(summary?.total_fertilizer_cost)}`,
      icon: FlaskConical,
      color: "text-emerald-700",
      bg: "bg-emerald-50/70",
      border: "border-emerald-200",
      visible: !categoryFilter || categoryFilter === "fertilizer",
    },
    {
      title: "Pesticide Applications",
      value: summary?.pesticide_applications_count ?? 0,
      subtext: `Total: ${formatCurrency(summary?.total_pesticide_cost)}`,
      icon: Bug,
      color: "text-amber-700",
      bg: "bg-amber-50/70",
      border: "border-amber-200",
      visible: !categoryFilter || categoryFilter === "pesticide",
    },
    {
      title: "Total Applications",
      value: summary?.total_applications_count ?? 0,
      subtext: "Logged across all plots",
      icon: Layers,
      color: "text-sky-700",
      bg: "bg-sky-50/70",
      border: "border-sky-200",
      visible: true,
    },
    {
      title: "Combined Input Cost",
      value: formatCurrency(summary?.total_combined_cost),
      subtext: "Nutrient & protection spend",
      icon: IndianRupee,
      color: "text-earth-900",
      bg: "bg-earth-50",
      border: "border-earth-200",
      visible: true,
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
              <div className="p-2.5 rounded-lg bg-white/80 shadow-2xs border border-earth-100">
                <IconComponent className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
