import React from "react";
import { OtherIncomeSummary } from "@/types";
import { Coins, Award, ListFilter, TrendingUp } from "lucide-react";

interface IncomeSummaryCardsProps {
  summary: OtherIncomeSummary | null;
  isLoading?: boolean;
}

export function IncomeSummaryCards({
  summary,
  isLoading = false,
}: IncomeSummaryCardsProps) {
  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const total = summary?.total_income || 0;
  const count = summary?.total_count || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* 1. Total Non-Crop Income */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-farm-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Total Other Income
          </span>
          <div className="h-8 w-8 rounded-lg bg-farm-50 text-farm-700 flex items-center justify-center">
            <Coins className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-earth-900 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-28 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(total)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          Subsidies, rentals, claims & agro-services
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-farm-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 2. Top Income Category */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Primary Category
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Award className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold text-emerald-700 tracking-tight truncate">
          {isLoading ? (
            <div className="h-8 w-28 bg-earth-100 animate-pulse rounded" />
          ) : (
            summary?.top_category || "None Recorded"
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          Highest yielding auxiliary income source
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 3. Transaction Count */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-earth-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Recorded Transactions
          </span>
          <div className="h-8 w-8 rounded-lg bg-earth-100 text-earth-700 flex items-center justify-center">
            <ListFilter className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-earth-900 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-16 bg-earth-100 animate-pulse rounded" />
          ) : (
            count
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          Distinct income vouchers tracked
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-earth-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

export default IncomeSummaryCards;
