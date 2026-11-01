import React from "react";
import { MonthlyFinancialRecord } from "@/types";
import { Calendar, ArrowUpRight, ArrowDownRight, Layers } from "lucide-react";

interface MonthlyBreakdownTableProps {
  data: MonthlyFinancialRecord[];
  isLoading?: boolean;
}

export function MonthlyBreakdownTable({
  data,
  isLoading = false,
}: MonthlyBreakdownTableProps) {
  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-8 text-center text-xs text-earth-500">
        Loading monthly breakdown ledger...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-xs mt-6">
      <div className="p-4 border-b border-earth-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-earth-900 flex items-center gap-2">
            <Layers className="h-4 w-4 text-farm-600" />
            <span>Monthly Performance Ledger</span>
          </h3>
          <p className="text-xs text-earth-500 mt-0.5">
            Month-by-month financial ledger of revenue, operating costs, and resulting profit margins
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-earth-50/80 border-b border-earth-200 text-[11px] font-semibold text-earth-600 uppercase tracking-wider">
              <th className="py-3 px-4">Period / Month</th>
              <th className="py-3 px-4 text-right">Produce Sales</th>
              <th className="py-3 px-4 text-right">Other Income</th>
              <th className="py-3 px-4 text-right">Total Revenue</th>
              <th className="py-3 px-4 text-right">Expenses</th>
              <th className="py-3 px-4 text-right">Net Profit / Loss</th>
              <th className="py-3 px-4 text-center">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-earth-100 font-mono">
            {data.map((m) => {
              const margin =
                m.total_income > 0
                  ? ((m.net_profit_loss / m.total_income) * 100).toFixed(1)
                  : "0.0";

              return (
                <tr
                  key={m.month}
                  className="hover:bg-earth-50/60 transition-colors"
                >
                  <td className="py-3.5 px-4 font-sans font-medium text-earth-900">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-earth-400" />
                      <span>{m.month_label}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right text-earth-700">
                    {formatInr(m.sales_revenue)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-sky-700">
                    {formatInr(m.other_income)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-earth-900">
                    {formatInr(m.total_income)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-rose-700">
                    {formatInr(m.total_expenses)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <span
                      className={`font-bold text-sm ${
                        m.is_profit ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {m.is_profit ? "+" : ""}
                      {formatInr(m.net_profit_loss)}
                    </span>
                    <div className="text-[10px] text-earth-400 font-sans mt-0.5">
                      {margin}% margin
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-sans">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        m.is_profit
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {m.is_profit ? (
                        <>
                          <ArrowUpRight className="h-3 w-3" /> Profit
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="h-3 w-3" /> Loss
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MonthlyBreakdownTable;
