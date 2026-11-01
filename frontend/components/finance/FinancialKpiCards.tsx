import React from "react";
import { FinancialSummary } from "@/types";
import {
  TrendingUp,
  Coins,
  Receipt,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Percent,
} from "lucide-react";

interface FinancialKpiCardsProps {
  summary: FinancialSummary | null;
  isLoading?: boolean;
}

export function FinancialKpiCards({
  summary,
  isLoading = false,
}: FinancialKpiCardsProps) {
  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const salesRevenue = summary?.total_sales_revenue || 0;
  const otherIncome = summary?.total_other_income || 0;
  const totalIncome = summary?.total_income || 0;
  const totalExpenses = summary?.total_expenses || 0;
  const netProfitLoss = summary?.net_profit_loss || 0;
  const isProfit = summary?.is_profit ?? true;
  const marginPct = summary?.profit_margin_percentage || 0;
  const receivables = summary?.outstanding_receivables || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {/* 1. Total Sales Revenue */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-farm-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Sales Revenue
          </span>
          <div className="h-8 w-8 rounded-lg bg-farm-50 text-farm-700 flex items-center justify-center">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-earth-900 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-24 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(salesRevenue)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <span>{summary?.total_sales_count || 0} produce sales</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-farm-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 2. Other Farm Income */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-sky-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Other Income
          </span>
          <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <Coins className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-earth-900 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-24 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(otherIncome)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <span>Subsidies, rent, claims</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-sky-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 3. Total Gross Income */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Total Revenue
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Wallet className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-emerald-700 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-24 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(totalIncome)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <span>Sales + Other Income</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 4. Operating Expenses */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-rose-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Operating Costs
          </span>
          <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
            <Receipt className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-rose-700 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-24 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(totalExpenses)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <span>{summary?.total_expenses_count || 0} recorded expenses</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 5. Net Profit or Loss (Prominent Hero Card) */}
      <div
        className={`bg-white rounded-xl border p-4 shadow-xs relative overflow-hidden transition-all col-span-1 ${
          isProfit ? "border-emerald-300 hover:border-emerald-400" : "border-rose-300 hover:border-rose-400"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-600">
            Net Profit / Loss
          </span>
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              isProfit ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}
          >
            {isProfit ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
          </div>
        </div>
        <div
          className={`mt-2 text-2xl font-black tracking-tight ${
            isProfit ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {isLoading ? (
            <div className="h-8 w-24 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(netProfitLoss)
          )}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span
            className={`font-semibold ${
              isProfit ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            {isProfit ? "✓ Net Profit" : "✗ Net Loss"}
          </span>
          <span className="text-earth-500 font-mono text-[11px]">
            {marginPct}% margin
          </span>
        </div>
        <div
          className={`absolute inset-x-0 bottom-0 h-1.5 ${
            isProfit ? "bg-emerald-500" : "bg-rose-500"
          }`}
        />
      </div>

      {/* 6. Outstanding Receivables */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Receivables
          </span>
          <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-amber-700 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-24 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(receivables)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <span>Uncollected buyer balances</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

export default FinancialKpiCards;
