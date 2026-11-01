"use client";

import React, { useState } from "react";
import { Farm } from "@/types";
import {
  Calendar,
  Filter,
  RefreshCw,
  Building2,
  ChevronDown,
  Clock,
} from "lucide-react";

export type DatePresetKey =
  | "all_time"
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "previous_month"
  | "this_year"
  | "custom";

interface DashboardFiltersProps {
  farms: Farm[];
  selectedFarmId: string;
  onSelectFarm: (farmId: string) => void;
  selectedPreset: DatePresetKey;
  onSelectPreset: (preset: DatePresetKey, startDate?: string, endDate?: string) => void;
  startDate?: string;
  endDate?: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function DashboardFilters({
  farms,
  selectedFarmId,
  onSelectFarm,
  selectedPreset,
  onSelectPreset,
  startDate,
  endDate,
  onRefresh,
  isRefreshing = false,
}: DashboardFiltersProps) {
  const [customStart, setCustomStart] = useState(startDate || "");
  const [customEnd, setCustomEnd] = useState(endDate || "");
  const [showCustomModal, setShowCustomModal] = useState(false);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const handlePresetChange = (preset: DatePresetKey) => {
    const today = new Date();
    if (preset === "all_time") {
      onSelectPreset("all_time", undefined, undefined);
      setShowCustomModal(false);
    } else if (preset === "today") {
      const todayStr = formatDate(today);
      onSelectPreset("today", todayStr, todayStr);
      setShowCustomModal(false);
    } else if (preset === "last_7_days") {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      onSelectPreset("last_7_days", formatDate(start), formatDate(today));
      setShowCustomModal(false);
    } else if (preset === "last_30_days") {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      onSelectPreset("last_30_days", formatDate(start), formatDate(today));
      setShowCustomModal(false);
    } else if (preset === "this_month") {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      onSelectPreset("this_month", formatDate(start), formatDate(end));
      setShowCustomModal(false);
    } else if (preset === "previous_month") {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      onSelectPreset("previous_month", formatDate(start), formatDate(end));
      setShowCustomModal(false);
    } else if (preset === "this_year") {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31);
      onSelectPreset("this_year", formatDate(start), formatDate(end));
      setShowCustomModal(false);
    } else if (preset === "custom") {
      setShowCustomModal(true);
    }
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      if (customStart > customEnd) {
        alert("Start date cannot be after end date.");
        return;
      }
      onSelectPreset("custom", customStart, customEnd);
      setShowCustomModal(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-earth-200 p-3 sm:p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
      {/* Farm estate selector */}
      <div className="flex items-center gap-2 flex-1 min-w-[220px]">
        <div className="p-2 bg-farm-50 text-farm-700 rounded-lg">
          <Building2 className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <label htmlFor="farm-filter" className="block text-[11px] font-medium text-earth-500 uppercase tracking-wider">
            Farm Estate Scope
          </label>
          <div className="relative mt-0.5">
            <select
              id="farm-filter"
              value={selectedFarmId}
              onChange={(e) => onSelectFarm(e.target.value)}
              className="w-full appearance-none bg-earth-50 border border-earth-200 text-earth-900 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-farm-500 cursor-pointer"
            >
              <option value="">All Farm Estates (Consolidated)</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.location ? `(${f.location})` : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-earth-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Date Range Filter Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="p-2 bg-amber-50 text-amber-700 rounded-lg hidden sm:block">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] font-medium text-earth-500 uppercase tracking-wider">
            Reporting Period
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <select
              id="date-preset-filter"
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value as DatePresetKey)}
              className="appearance-none bg-earth-50 border border-earth-200 text-earth-900 text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-farm-500 cursor-pointer"
            >
              <option value="all_time">All Time (Historical)</option>
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="previous_month">Previous Month</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Date Range...</option>
            </select>

            {/* Custom Range Popover or Trigger Button */}
            {selectedPreset === "custom" && (
              <button
                type="button"
                onClick={() => setShowCustomModal(!showCustomModal)}
                className="text-xs font-medium text-farm-700 bg-farm-50 hover:bg-farm-100 border border-farm-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1"
              >
                <span>{startDate || "Start"} → {endDate || "End"}</span>
              </button>
            )}

            {/* Refresh Action */}
            <button
              type="button"
              id="dashboard-refresh-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Analytics Dataset"
              className="p-1.5 text-earth-600 hover:text-earth-900 bg-earth-50 hover:bg-earth-100 border border-earth-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin text-farm-600" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Modal / Dropdown Bar */}
      {showCustomModal && (
        <div className="w-full mt-2 pt-3 border-t border-earth-100 flex flex-wrap items-center gap-2 bg-earth-50/70 p-2.5 rounded-lg">
          <div className="flex items-center gap-1.5 text-xs text-earth-700">
            <Clock className="h-3.5 w-3.5 text-farm-600" />
            <span className="font-medium">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-white border border-earth-300 rounded px-2 py-1 text-xs text-earth-900"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-earth-700">
            <span className="font-medium">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-white border border-earth-300 rounded px-2 py-1 text-xs text-earth-900"
            />
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={handleApplyCustom}
              className="bg-farm-600 hover:bg-farm-700 text-white text-xs font-semibold px-3 py-1 rounded"
            >
              Apply Filter
            </button>
            <button
              type="button"
              onClick={() => setShowCustomModal(false)}
              className="bg-earth-200 hover:bg-earth-300 text-earth-800 text-xs px-2.5 py-1 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardFilters;
