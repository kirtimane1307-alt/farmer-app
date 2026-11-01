"use client";

import React from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Receipt, PieChart as PieChartIcon } from "lucide-react";
import { ExpenseCategoryItem } from "@/lib/api/dashboard";

interface ExpenseCategoryChartProps {
  data: ExpenseCategoryItem[];
  isLoading?: boolean;
}

const CATEGORY_COLORS = [
  "#ef4444", // Red (Fertilizer)
  "#f97316", // Orange (Seeds)
  "#f59e0b", // Amber (Pesticides)
  "#10b981", // Emerald (Labour)
  "#06b6d4", // Cyan (Irrigation)
  "#3b82f6", // Blue (Equipment)
  "#8b5cf6", // Purple (Fuel)
  "#ec4899", // Pink (Maintenance)
  "#64748b", // Slate (Other)
];

export function ExpenseCategoryChart({
  data,
  isLoading = false,
}: ExpenseCategoryChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-farm-600 border-t-transparent animate-spin mb-2" />
        <span className="text-xs text-earth-500">Loading expense breakdown...</span>
      </div>
    );
  }

  const validData = (data || []).filter((item) => Number(item.amount) > 0);
  const totalExpense = validData.reduce((acc, curr) => acc + Number(curr.amount), 0);

  if (validData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center text-center">
        <div className="p-3 bg-earth-100 rounded-full text-earth-400 mb-2">
          <PieChartIcon className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-earth-800">
          No Categorized Expenses
        </h4>
        <p className="text-xs text-earth-500 max-w-sm mt-1">
          No expenses recorded for this period. Add expenses to inspect allocation across seeds, fertilizer, machinery, and labour.
        </p>
      </div>
    );
  }

  const formatTooltip = (value: any, name: string) => {
    const num = Number(value) || 0;
    const pct = totalExpense > 0 ? ((num / totalExpense) * 100).toFixed(1) : "0";
    return [`₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2 })} (${pct}%)`, name];
  };

  return (
    <div className="space-y-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={validData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="amount"
              nameKey="label"
            >
              {validData.map((_, index) => (
                <Cell
                  key={`cell-exp-${index}`}
                  fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                borderRadius: "0.75rem",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontSize: "12px",
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={40}
              iconType="circle"
              formatter={(value) => (
                <span className="text-xs font-medium text-earth-700">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between border-t border-earth-100 pt-3 text-xs text-earth-600">
        <div className="flex items-center gap-1.5 font-medium">
          <Receipt className="h-4 w-4 text-rose-600" />
          <span>Total Operational Outlay:</span>
          <span className="font-semibold text-earth-900">
            ₹{totalExpense.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="text-[11px] text-earth-500">
          {validData.length} Active {validData.length === 1 ? "Category" : "Categories"}
        </div>
      </div>
    </div>
  );
}

export default ExpenseCategoryChart;
