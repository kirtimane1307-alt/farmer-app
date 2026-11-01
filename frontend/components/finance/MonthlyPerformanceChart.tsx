import React from "react";
import { MonthlyFinancialRecord } from "@/types";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { BarChart3 } from "lucide-react";

interface MonthlyPerformanceChartProps {
  data: MonthlyFinancialRecord[];
  isLoading?: boolean;
}

export function MonthlyPerformanceChart({
  data,
  isLoading = false,
}: MonthlyPerformanceChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-xs h-80 flex flex-col items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-farm-600 border-t-transparent animate-spin mb-2" />
        <span className="text-xs text-earth-500">Loading performance chart...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-xs h-80 flex flex-col items-center justify-center text-center">
        <div className="p-3 bg-earth-100 rounded-full text-earth-400 mb-2">
          <BarChart3 className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-earth-800">
          No Monthly Telemetry Available
        </h4>
        <p className="text-xs text-earth-500 max-w-sm mt-1">
          Record produce sales, other farm income, or expenses to view month-by-month financial comparative trends.
        </p>
      </div>
    );
  }

  // Format currency for chart tooltip
  const formatTooltipValue = (value: any, name: string) => {
    const val = Number(value) || 0;
    return [`₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, name];
  };

  const formatYAxis = (val: number) => {
    if (Math.abs(val) >= 100000) {
      return `₹${(val / 100000).toFixed(1)}L`;
    }
    if (Math.abs(val) >= 1000) {
      return `₹${(val / 1000).toFixed(0)}k`;
    }
    return `₹${val}`;
  };

  return (
    <div className="bg-white rounded-xl border border-earth-200 p-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-earth-900 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-farm-600" />
            <span>Monthly Revenue vs. Operating Expenses vs. Net Profit</span>
          </h3>
          <p className="text-xs text-earth-500 mt-0.5">
            Compare monthly operational revenue against costs and observe net financial yield
          </p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="month_label"
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxis}
              tick={{ fill: "#64748b", fontSize: 11 }}
            />
            <Tooltip
              formatter={formatTooltipValue}
              contentStyle={{
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                borderColor: "#e2e8f0",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontSize: "12px",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              iconType="circle"
            />
            <Bar
              dataKey="total_income"
              name="Total Revenue"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Bar
              dataKey="total_expenses"
              name="Operating Costs"
              fill="#f43f5e"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
            <Line
              type="monotone"
              dataKey="net_profit_loss"
              name="Net Profit / Loss"
              stroke="#0f172a"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#0f172a" }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default MonthlyPerformanceChart;
