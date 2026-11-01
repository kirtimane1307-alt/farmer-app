import React from "react";
import { HarvestSummary } from "@/types";
import { Package, Scale, Layers, Award, TrendingUp } from "lucide-react";

interface HarvestSummaryCardsProps {
  summary: HarvestSummary | null;
  loading?: boolean;
}

export function HarvestSummaryCards({ summary, loading }: HarvestSummaryCardsProps) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-earth-100/70 animate-pulse border border-earth-200" />
        ))}
      </div>
    );
  }

  // Metric yield conversion for display (e.g., if > 1000 kg, show tonnes too)
  const metricKg = Number(summary.total_metric_weight_kg || 0);
  const metricTonnes = (metricKg / 1000).toFixed(2);

  // Discrete units string (e.g. "120 Bags, 40 Crates")
  const discreteEntries = Object.entries(summary.by_unit || {}).filter(
    ([unit]) => !["kg", "quintals", "tonnes", "grams"].includes(unit.toLowerCase())
  );
  const discreteText =
    discreteEntries.length > 0
      ? discreteEntries.map(([unit, qty]) => `${Number(qty).toLocaleString("en-IN")} ${unit}`).join(", ")
      : "No discrete packaging";

  // Top harvested crop
  const topCrop =
    summary.by_crop && summary.by_crop.length > 0
      ? [...summary.by_crop].sort((a, b) => (b.metric_weight_kg || 0) - (a.metric_weight_kg || 0))[0]
      : null;

  // Grade A / Premium percentage
  const totalLogs = summary.total_harvests || 0;
  const gradeACount =
    (summary.by_quality_grade?.["Grade A"] || 0) +
    (summary.by_quality_grade?.["grade a"] || 0) +
    (summary.by_quality_grade?.["Premium"] || 0);
  const gradeAPercent = totalLogs > 0 ? Math.round((gradeACount / totalLogs) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total Harvest Logs */}
      <div className="bg-white p-4 rounded-xl border border-earth-200 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-earth-500 uppercase tracking-wider">
            Total Harvests
          </span>
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
            <Package className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-earth-900 font-mono">
            {summary.total_harvests}
          </span>
          <span className="text-xs text-earth-500">recorded yields</span>
        </div>
        <div className="mt-2 text-xs text-earth-600 flex items-center gap-1">
          <span className="text-emerald-700 font-medium">
            Across {summary.by_crop?.length || 0} crops
          </span>
          <span>and {summary.by_field?.length || 0} fields</span>
        </div>
      </div>

      {/* 2. Total Metric Yield (kg / Tonnes) */}
      <div className="bg-white p-4 rounded-xl border border-earth-200 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-earth-500 uppercase tracking-wider">
            Total Metric Weight
          </span>
          <div className="p-2 rounded-lg bg-harvest-50 text-harvest-700">
            <Scale className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-earth-900 font-mono">
            {metricKg.toLocaleString("en-IN", { maximumFractionDigits: 1 })}
          </span>
          <span className="text-xs font-semibold text-harvest-800">kg</span>
        </div>
        <div className="mt-2 text-xs text-earth-600 flex items-center gap-1">
          <span className="font-semibold text-earth-800">≈ {metricTonnes} Tonnes</span>
          <span className="text-earth-400">| exact metric rollup</span>
        </div>
      </div>

      {/* 3. Discrete Packaged Produce (Bags, Crates, etc.) */}
      <div className="bg-white p-4 rounded-xl border border-earth-200 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-earth-500 uppercase tracking-wider">
            Packaged Produce
          </span>
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-earth-900 truncate" title={discreteText}>
            {discreteEntries.length > 0
              ? `${Number(discreteEntries[0][1]).toLocaleString("en-IN")} ${discreteEntries[0][0]}`
              : "0 Containers"}
          </span>
        </div>
        <div className="mt-2 text-xs text-earth-600 truncate" title={discreteText}>
          {discreteEntries.length > 1
            ? `+ ${discreteEntries.slice(1).map(([u, q]) => `${q} ${u}`).join(", ")}`
            : "No other non-metric units"}
        </div>
      </div>

      {/* 4. Top Yield Crop & Quality Rating */}
      <div className="bg-white p-4 rounded-xl border border-earth-200 shadow-2xs hover:shadow-xs transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-earth-500 uppercase tracking-wider">
            Top Crop & Quality
          </span>
          <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
            <Award className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-earth-900 truncate">
            {topCrop ? topCrop.crop_name : "None logged"}
          </span>
          {topCrop && <span className="text-xs text-earth-500 font-mono">({topCrop.crop_variety})</span>}
        </div>
        <div className="mt-2 text-xs text-earth-600 flex items-center justify-between">
          <span>{gradeAPercent}% Grade A / Premium</span>
          <span className="font-semibold text-emerald-700">{gradeACount} logs</span>
        </div>
      </div>
    </div>
  );
}
