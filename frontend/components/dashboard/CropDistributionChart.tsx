"use client";

import React from "react";
import { Crop } from "@/types";
import { CropDistributionItem } from "@/lib/api/dashboard";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Wheat, PieChart as PieChartIcon } from "lucide-react";

interface CropDistributionChartProps {
  crops?: Crop[];
  items?: CropDistributionItem[];
  isLoading?: boolean;
}

const CROP_COLORS = [
  "#16a34a", // Farm Green (Soybean / pulses)
  "#f59e0b", // Harvest Amber (Corn / Cereals)
  "#10b981", // Emerald (Orchards / Mango)
  "#3b82f6", // Blue (Wheat)
  "#8b5cf6", // Purple (Cotton)
  "#ec4899", // Rose (Vegetables)
  "#06b6d4", // Cyan (Spices)
];

export function CropDistributionChart({
  crops,
  items,
  isLoading = false,
}: CropDistributionChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-farm-600 border-t-transparent animate-spin mb-2" />
        <span className="text-xs text-earth-500">Loading crop cultivation data...</span>
      </div>
    );
  }

  let chartData: { name: string; variety: string; value: number; unit: string }[] = [];

  if (items && items.length > 0) {
    chartData = items.map((it) => ({
      name: it.name,
      variety: it.variety,
      value: Number(it.planted_area) || 0,
      unit: it.planted_area_unit || "Acres",
    }));
  } else if (crops && crops.length > 0) {
    const validCrops = crops.filter(
      (c) => Number(c.planted_area || 0) > 0 || c.status === "growing" || c.status === "planned"
    );
    const dataMap: Record<string, { name: string; variety: string; value: number; unit: string }> = {};
    validCrops.forEach((crop) => {
      const area = Number(crop.planted_area || 1);
      const key = crop.name;
      if (dataMap[key]) {
        dataMap[key].value += area;
      } else {
        dataMap[key] = {
          name: crop.name,
          variety: crop.variety,
          value: area,
          unit: crop.planted_area_unit || "Acres",
        };
      }
    });
    chartData = Object.values(dataMap);
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center text-center">
        <div className="p-3 bg-earth-100 rounded-full text-earth-400 mb-2">
          <PieChartIcon className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-earth-800">
          No Crop Cycles Recorded
        </h4>
        <p className="text-xs text-earth-500 max-w-sm mt-1">
          Add field plots and register sown crop cycles to view automated land utilization and variety distribution.
        </p>
      </div>
    );
  }

  const totalArea = chartData.reduce((sum, item) => sum + item.value, 0);

  const formatTooltip = (value: any, name: string) => {
    const num = Number(value) || 0;
    const pct = totalArea > 0 ? ((num / totalArea) * 100).toFixed(1) : "0";
    return [`${num} Acres (${pct}%)`, name];
  };

  return (
    <div className="space-y-4">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CROP_COLORS[index % CROP_COLORS.length]}
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
              height={36}
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
          <Wheat className="h-4 w-4 text-farm-600" />
          <span>Total Cultivated Land:</span>
          <span className="font-semibold text-earth-900">{totalArea.toFixed(1)} Acres</span>
        </div>
        <div className="text-[11px] text-earth-500">
          {chartData.length} Active {chartData.length === 1 ? "Variety" : "Varieties"}
        </div>
      </div>
    </div>
  );
}

export default CropDistributionChart;
