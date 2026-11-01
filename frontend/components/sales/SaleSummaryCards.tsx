import React from "react";
import { SaleSummary } from "@/types";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Package,
  Award,
  Users,
} from "lucide-react";

interface SaleSummaryCardsProps {
  summary: SaleSummary | null;
  isLoading?: boolean;
}

export function SaleSummaryCards({
  summary,
  isLoading = false,
}: SaleSummaryCardsProps) {
  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const revenue = summary?.total_revenue || 0;
  const received = summary?.total_received || 0;
  const outstanding = summary?.total_outstanding || 0;
  const quantity = summary?.total_quantity_sold || 0;
  const collectionPct = revenue > 0 ? ((received / revenue) * 100).toFixed(1) : "0.0";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Sales Revenue */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-farm-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Total Sales Revenue
          </span>
          <div className="h-8 w-8 rounded-lg bg-farm-50 text-farm-700 flex items-center justify-center">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-earth-900 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-28 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(revenue)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500 justify-between">
          <span>
            <strong className="text-earth-700">{summary?.total_sales_count || 0}</strong> invoices
          </span>
          {summary?.total_discount ? (
            <span className="text-amber-600 font-medium">
              -₹{Number(summary.total_discount).toLocaleString("en-IN")} disc.
            </span>
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-farm-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 2. Payments Collected */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Collected Receipts
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-emerald-700 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-28 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(received)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <span className="text-emerald-700 font-semibold mr-1">{collectionPct}%</span>
          collected of total value
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 3. Outstanding Receivables */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Outstanding Receivables
          </span>
          <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-amber-700 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-28 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(outstanding)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <span className="font-semibold text-amber-700 mr-1">
            {(summary?.unpaid_count || 0) + (summary?.partially_paid_count || 0)}
          </span>{" "}
          pending buyer balance(s)
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* 4. Total Volume Sold & Top Produce */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-earth-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Volume & Market
          </span>
          <div className="h-8 w-8 rounded-lg bg-earth-100 text-earth-700 flex items-center justify-center">
            <Package className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-earth-900 tracking-tight flex items-baseline gap-1">
          {isLoading ? (
            <div className="h-8 w-28 bg-earth-100 animate-pulse rounded" />
          ) : (
            <>
              {Number(quantity).toLocaleString("en-IN", { maximumFractionDigits: 1 })}
              <span className="text-sm font-normal text-earth-500">units</span>
            </>
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500 truncate">
          {summary?.top_crop ? (
            <span className="flex items-center gap-1 text-farm-700 font-medium truncate">
              <Award className="h-3 w-3 shrink-0" /> Top: {summary.top_crop}
            </span>
          ) : summary?.top_buyer ? (
            <span className="flex items-center gap-1 text-earth-600 truncate">
              <Users className="h-3 w-3 shrink-0" /> Buyer: {summary.top_buyer}
            </span>
          ) : (
            <span>Produce sold to date</span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-earth-500 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

export default SaleSummaryCards;
