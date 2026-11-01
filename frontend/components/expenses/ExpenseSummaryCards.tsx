import React from "react";
import { ExpenseSummary } from "@/types";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import {
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  Receipt,
} from "lucide-react";

interface ExpenseSummaryCardsProps {
  summary: ExpenseSummary | null;
  isLoading?: boolean;
}

export function ExpenseSummaryCards({
  summary,
  isLoading = false,
}: ExpenseSummaryCardsProps) {
  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const total = summary?.total_expenses || 0;
  const paid = summary?.total_paid || 0;
  const unpaid = summary?.total_unpaid || 0;
  const partiallyPaid = summary?.total_partially_paid || 0;
  const paidPct = total > 0 ? ((paid / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* 1. Total Expenses */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-earth-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Total Expenses
          </span>
          <div className="h-8 w-8 rounded-lg bg-farm-50 text-farm-700 flex items-center justify-center">
            <Receipt className="h-4 w-4" />
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
          <span className="font-semibold text-earth-700 mr-1">
            {summary?.expense_count || 0}
          </span>{" "}
          recorded entries
        </div>
      </div>

      {/* 2. Paid Expenses */}
      <div className="bg-white rounded-xl border border-emerald-100 p-4 shadow-xs relative overflow-hidden group hover:border-emerald-200 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Disbursed (Paid)
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-emerald-800 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-28 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(paid)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-emerald-600 font-medium">
          <span>{paidPct}% settled</span>
          <span className="mx-1.5 text-emerald-300">&bull;</span>
          <span>{summary?.paid_count || 0} fully paid</span>
        </div>
      </div>

      {/* 3. Outstanding Unpaid Balance */}
      <div className="bg-white rounded-xl border border-rose-100 p-4 shadow-xs relative overflow-hidden group hover:border-rose-200 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-700">
            Outstanding Due
          </span>
          <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-rose-800 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-28 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(unpaid)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-rose-600">
          <span className="font-semibold text-rose-700 mr-1">
            {summary?.unpaid_count || 0}
          </span>{" "}
          unpaid bills pending
        </div>
      </div>

      {/* 4. Partially Paid */}
      <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-xs relative overflow-hidden group hover:border-amber-200 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Partial Payments
          </span>
          <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-amber-800 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-28 bg-earth-100 animate-pulse rounded" />
          ) : (
            summary?.partially_paid_count || 0
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-amber-700">
          <span>Active payment installments</span>
        </div>
      </div>

      {/* 5. Highest Category */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-earth-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Top Expenditure
          </span>
          <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1.5">
          {isLoading ? (
            <div className="h-8 w-28 bg-earth-100 animate-pulse rounded" />
          ) : summary?.highest_category ? (
            <div className="flex flex-col">
              <span className="text-xl font-bold text-earth-900 tracking-tight truncate">
                {formatInr(summary.highest_category.total_amount)}
              </span>
              <div className="mt-1">
                <ExpenseCategoryBadge
                  category={summary.highest_category.category}
                  size="sm"
                />
              </div>
            </div>
          ) : (
            <span className="text-sm text-earth-400 italic">No data</span>
          )}
        </div>
      </div>
    </div>
  );
}
