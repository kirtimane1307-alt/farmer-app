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
import { Sprout, ShoppingBag } from "lucide-react";
import { HarvestTrendItem } from "@/lib/api/dashboard";

interface HarvestTrendChartProps {
  data: HarvestTrendItem[];
  isLoading?: boolean;
}

export function HarvestTrendChart({
  data,
  isLoading = false,
}: HarvestTrendChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-farm-600 border-t-transparent animate-spin mb-2" />
        <span className="text-xs text-earth-500">Loading harvest logs...</span>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center text-center">
        <div className="p-3 bg-earth-100 rounded-full text-earth-400 mb-2">
          <Sprout className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-earth-800">
          No Harvest Records
        </h4>
        <p className="text-xs text-earth-500 max-w-sm mt-1">
          Record harvested crop yields in Crop Management to track periodic agricultural output and yields over time.
        </p>
      </div>
    );
  }

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload as HarvestTrendItem;
      return (
        <div className="bg-white p-3 border border-earth-200 rounded-xl shadow-lg text-xs space-y-1">
          <p className="font-semibold text-earth-900 border-b border-earth-100 pb-1">{label}</p>
          <p className="text-farm-700 flex justify-between gap-4">
            <span>Total Harvested:</span>
            <span className="font-semibold">{Number(item.total_quantity).toLocaleString("en-IN")} {item.unit}</span>
          </p>
          <p className="text-earth-600 flex justify-between gap-4">
            <span>Harvest Events:</span>
            <span className="font-semibold">{item.harvest_count}</span>
          </p>
          {item.crops_harvested && item.crops_harvested.length > 0 && (
            <p className="text-earth-500 pt-1 border-t border-earth-100">
              Crops: {item.crops_harvested.join(", ")}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const totalYield = data.reduce((acc, curr) => acc + Number(curr.total_quantity), 0);
  const primaryUnit = data[0]?.unit || "Units";

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
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
            />
            <Tooltip content={customTooltip} />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={() => (
                <span className="text-xs font-medium text-earth-700">
                  Yield Output ({primaryUnit})
                </span>
              )}
            />
            <Bar
              dataKey="total_quantity"
              name="total_quantity"
              fill="#0ea5e9"
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between border-t border-earth-100 pt-3 text-xs text-earth-600">
        <div className="flex items-center gap-1.5 font-medium">
          <ShoppingBag className="h-4 w-4 text-sky-600" />
          <span>Total Periodic Yield:</span>
          <span className="font-semibold text-earth-900">
            {totalYield.toLocaleString("en-IN")} {primaryUnit}
          </span>
        </div>
        <span className="text-[11px] text-earth-500">
          Aggregated by production cycle
        </span>
      </div>
    </div>
  );
}

export default HarvestTrendChart;
