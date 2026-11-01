import React from "react";
import { FinancialSummary } from "@/types";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  Scale,
  CreditCard,
  Wallet,
} from "lucide-react";

interface ProfitLossIndicatorProps {
  summary: FinancialSummary | null;
}

export function ProfitLossIndicator({ summary }: ProfitLossIndicatorProps) {
  if (!summary) return null;

  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const isProfit = summary.is_profit;
  const netProfit = summary.net_profit_loss;
  const margin = summary.profit_margin_percentage;

  return (
    <div className="space-y-4 mb-6">
      {/* Visual Status Banner */}
      <div
        className={`rounded-xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isProfit
            ? "bg-emerald-50/70 border-emerald-200"
            : "bg-rose-50/70 border-rose-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              isProfit
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {isProfit ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <div>
            <h4
              className={`text-base font-bold ${
                isProfit ? "text-emerald-900" : "text-rose-900"
              }`}
            >
              {isProfit
                ? "Farm Operating with Positive Net Margin"
                : "Farm Operating at an Accounting Deficit (Net Loss)"}
            </h4>
            <p className="text-xs text-earth-600 mt-0.5">
              {isProfit
                ? `Total farm revenue exceeds operating disbursements by ${formatInr(
                    netProfit
                  )} (${margin}% recorded margin).`
                : `Operating disbursements exceed total revenue by ${formatInr(
                    Math.abs(netProfit)
                  )}. Review crop cycles and expense controls.`}
            </p>
          </div>
        </div>

        {/* Cash Flow Telemetry */}
        <div className="flex items-center gap-4 text-xs font-mono bg-white/80 p-2.5 rounded-lg border border-earth-200 shrink-0">
          <div>
            <span className="text-earth-400 block text-[10px]">Cash Received</span>
            <span className="font-bold text-emerald-700">
              {formatInr(summary.total_sales_received)}
            </span>
          </div>
          <div className="h-6 w-px bg-earth-200" />
          <div>
            <span className="text-earth-400 block text-[10px]">Cash Disbursed</span>
            <span className="font-bold text-rose-700">
              {formatInr(summary.total_expenses_paid)}
            </span>
          </div>
        </div>
      </div>

      {/* Accounting Disclaimer Note */}
      <div className="p-3 bg-earth-50 border border-earth-200 rounded-lg flex items-start gap-2.5 text-xs text-earth-600">
        <Info className="h-4 w-4 text-earth-400 mt-0.5 shrink-0" />
        <p className="leading-relaxed">
          <strong>Accounting Scope Disclaimer:</strong> {summary.disclaimer}
        </p>
      </div>
    </div>
  );
}

export default ProfitLossIndicator;
