"use client";

import React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { DollarSign, ShieldAlert } from "lucide-react";
import { IncomeExpenseTrendItem } from "@/lib/api/dashboard";

interface FinancialPerformanceChartProps {
  data: IncomeExpenseTrendItem[];
  isLoading?: boolean;
}

export function FinancialPerformanceChart({
  data,
  isLoading = false,
}: FinancialPerformanceChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-farm-600 border-t-transparent animate-spin mb-2" />
        <span className="text-xs text-earth-500">Loading financial performance trend...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center text-center">
        <div className="p-3 bg-earth-100 rounded-full text-earth-400 mb-2">
          <DollarSign className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-earth-800">
          No Financial Performance Data
        </h4>
        <p className="text-xs text-earth-500 max-w-sm mt-1">
          Historical profit/loss trends require recorded produce revenue or invoices.
        </p>
      </div>
    );
  }

  const formatCurrency = (val: any) => {
    const num = Number(val) || 0;
    if (Math.abs(num) >= 100000) {
      return `₹${(num / 100000).toFixed(1)}L`;
    }
    if (Math.abs(num) >= 1000) {
      return `₹${(num / 1000).toFixed(0)}k`;
    }
    return `₹${num}`;
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const inc = payload.find((p: any) => p.dataKey === "total_income")?.value || 0;
      const exp = payload.find((p: any) => p.dataKey === "expenses")?.value || 0;
      const profit = payload.find((p: any) => p.dataKey === "net_profit")?.value || 0;
      const margin = inc > 0 ? ((profit / inc) * 100).toFixed(1) : "0.0";
      return (
        <div className="bg-white p-3 border border-earth-200 rounded-xl shadow-lg text-xs space-y-1">
          <p className="font-semibold text-earth-900 border-b border-earth-100 pb-1">{label}</p>
          <p className="text-farm-700 flex justify-between gap-4">
            <span>Total Income:</span>
            <span className="font-semibold">₹{Number(inc).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </p>
          <p className="text-rose-600 flex justify-between gap-4">
            <span>Expenses:</span>
            <span className="font-semibold">₹{Number(exp).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </p>
          <p className={`pt-1 border-t border-earth-100 font-semibold flex justify-between gap-4 ${profit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            <span>Net {profit >= 0 ? "Profit" : "Loss"}:</span>
            <span>₹{Number(profit).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ({margin}%)</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={{ stroke: "#cbd5e1" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={customTooltip} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => {
                const labels: Record<string, string> = {
                  total_income: "Gross Income",
                  expenses: "Expenses",
                  net_profit: "Net Profit / Loss",
                };
                return (
                  <span className="text-xs font-medium text-earth-700">
                    {labels[value] || value}
                  </span>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="net_profit"
              name="net_profit"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#profitAreaGrad)"
            />
            <Line
              type="monotone"
              dataKey="total_income"
              name="total_income"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              name="expenses"
              stroke="#f43f5e"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between border-t border-earth-100 pt-3 text-xs text-earth-600">
        <div className="flex items-center gap-1.5 font-medium">
          <DollarSign className="h-4 w-4 text-emerald-600" />
          <span>Recorded Financial Trajectory</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-earth-500">
          <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
          <span>Internal farm ledger figures (not audited)</span>
        </div>
      </div>
    </div>
  );
}

export default FinancialPerformanceChart;
