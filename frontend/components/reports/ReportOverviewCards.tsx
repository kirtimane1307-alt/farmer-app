"use client";

import React from "react";
import { ReportsOverview } from "@/types";
import {
  FileBarChart,
  Tractor,
  TrendingUp,
  Receipt,
  Scale,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface ReportOverviewCardsProps {
  overview: ReportsOverview | null;
  loading: boolean;
}

export function ReportOverviewCards({ overview, loading }: ReportOverviewCardsProps) {
  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
            <div className="h-6 bg-slate-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (!overview) return null;

  const isProfit = overview.is_profit;

  return (
    <div className="space-y-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Report Categories */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <FileBarChart className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Categories</p>
            <p className="text-xl font-bold text-slate-900">{overview.total_categories}</p>
            <p className="text-xs text-slate-400">Supported Reports</p>
          </div>
        </div>

        {/* Available Farms */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700">
            <Tractor className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Farms</p>
            <p className="text-xl font-bold text-slate-900">{overview.available_farms_count}</p>
            <p className="text-xs text-slate-400">{overview.total_fields_count} Cultivated Plots</p>
          </div>
        </div>

        {/* Total Gross Income */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Income</p>
            <p className="text-xl font-bold text-slate-900">{formatInr(overview.total_income)}</p>
            <p className="text-xs text-slate-400">Sales + Other Income</p>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Expenses</p>
            <p className="text-xl font-bold text-slate-900">{formatInr(overview.total_expenses)}</p>
            <p className="text-xs text-slate-400">All Operations</p>
          </div>
        </div>

        {/* Recorded Profit / Loss */}
        <div
          className={`rounded-xl p-4 border shadow-sm flex items-center gap-3 ${
            isProfit
              ? "bg-emerald-50/60 border-emerald-200"
              : "bg-rose-50/60 border-rose-200"
          }`}
        >
          <div
            className={`p-2.5 rounded-lg ${
              isProfit ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}
          >
            {isProfit ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-600 uppercase tracking-wider">
              {isProfit ? "Recorded Net Profit" : "Recorded Net Loss"}
            </p>
            <p
              className={`text-xl font-bold ${
                isProfit ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              {formatInr(overview.recorded_profit_loss)}
            </p>
            <p className="text-xs text-slate-500">Margin: {overview.profit_margin_percentage}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportOverviewCards;

