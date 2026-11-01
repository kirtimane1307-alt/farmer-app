"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TrendingUp, BarChart3 } from "lucide-react";
import { IncomeExpenseTrendItem } from "@/lib/api/dashboard";

interface IncomeExpenseChartProps {
  data: IncomeExpenseTrendItem[];
  isLoading?: boolean;
}

export function IncomeExpenseChart({
  data,
  isLoading = false,
}: IncomeExpenseChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-farm-600 border-t-transparent animate-spin mb-2" />
        <span className="text-xs text-earth-500">Loading income & expense records...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center text-center">
        <div className="p-3 bg-earth-100 rounded-full text-earth-400 mb-2">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-earth-800">
          No Income or Expense Records
        </h4>
        <p className="text-xs text-earth-500 max-w-sm mt-1">
          Record produce sales, subsidies, or operational farm expenses to track financial trends across periods.
        </p>
      </div>
    );
  }

  const formatCurrency = (val: any) => {
    const num = Number(val) || 0;
    if (num >= 100000) {
      return `₹${(num / 100000).toFixed(1)}L`;
    }
    if (num >= 1000) {
      return `₹${(num / 1000).toFixed(0)}k`;
    }
    return `₹${num.toLocaleString("en-IN")}`;
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const inc = payload.find((p: any) => p.dataKey === "total_income")?.value || 0;
      const exp = payload.find((p: any) => p.dataKey === "expenses")?.value || 0;
      const net = inc - exp;
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
          <p className={`pt-1 border-t border-earth-100 font-semibold flex justify-between gap-4 ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
            <span>Net {net >= 0 ? "Profit" : "Deficit"}:</span>
            <span>₹{Number(Math.abs(net)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
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
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
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
              formatter={(value) => (
                <span className="text-xs font-medium text-earth-700">
                  {value === "total_income" ? "Total Income" : "Operating Expenses"}
                </span>
              )}
            />
            <Bar
              dataKey="total_income"
              name="total_income"
              fill="#16a34a"
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
            />
            <Bar
              dataKey="expenses"
              name="expenses"
              fill="#f43f5e"
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between border-t border-earth-100 pt-3 text-xs text-earth-600">
        <div className="flex items-center gap-1.5 font-medium">
          <TrendingUp className="h-4 w-4 text-farm-600" />
          <span>Timeline View:</span>
          <span className="font-semibold text-earth-800">{data.length} Tracked {data.length === 1 ? "Period" : "Periods"}</span>
        </div>
        <span className="text-[11px] text-earth-500">
          Amounts calculated from verified sales & recorded invoices
        </span>
      </div>
    </div>
  );
}

export default IncomeExpenseChart;
