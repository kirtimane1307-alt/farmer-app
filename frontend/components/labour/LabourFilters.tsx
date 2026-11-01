"use client";

import React from "react";
import { Farm } from "@/types";
import { Button, Input, Select } from "@/components/ui";
import { Search, X, LayoutGrid, List, Filter, RotateCcw } from "lucide-react";

interface LabourFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string; // "all" | "active" | "inactive"
  onStatusChange: (status: string) => void;
  selectedFarmId: string;
  onFarmChange: (farmId: string) => void;
  selectedWorkType: string;
  onWorkTypeChange: (workType: string) => void;
  viewMode: "grid" | "table";
  onViewModeChange: (mode: "grid" | "table") => void;
  farms: Farm[];
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

const WORK_TYPES = [
  "General Labour",
  "Tractor Operator",
  "Irrigation Worker",
  "Harvest Worker",
  "Field Worker",
  "Other",
];

export function LabourFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  selectedFarmId,
  onFarmChange,
  selectedWorkType,
  onWorkTypeChange,
  viewMode,
  onViewModeChange,
  farms,
  onResetFilters,
  hasActiveFilters,
}: LabourFiltersProps) {
  return (
    <div className="space-y-3 bg-white p-4 rounded-2xl border border-earth-200 shadow-2xs">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Input
            placeholder="Search workers by name, phone, trade, or farm..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-earth-400" />}
            className="w-full pl-9 pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-600 p-0.5 rounded"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Pill Tabs & View Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          {/* Status Tabs */}
          <div className="flex items-center bg-earth-100/80 p-0.5 rounded-lg border border-earth-200 text-xs">
            <button
              type="button"
              onClick={() => onStatusChange("all")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-white text-earth-900 shadow-2xs"
                  : "text-earth-600 hover:text-earth-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onStatusChange("active")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === "active"
                  ? "bg-farm-600 text-white shadow-2xs"
                  : "text-earth-600 hover:text-earth-900"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => onStatusChange("inactive")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === "inactive"
                  ? "bg-earth-800 text-white shadow-2xs"
                  : "text-earth-600 hover:text-earth-900"
              }`}
            >
              Inactive
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="hidden sm:flex items-center bg-earth-100/80 p-0.5 rounded-lg border border-earth-200">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-white text-earth-900 shadow-2xs"
                  : "text-earth-500 hover:text-earth-900"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-white text-earth-900 shadow-2xs"
                  : "text-earth-500 hover:text-earth-900"
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Dropdowns (Farm & Work Type) */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-earth-100 text-xs">
        <div className="flex items-center text-earth-500 gap-1 shrink-0 font-medium">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>

        {/* Farm Filter */}
        <div className="w-48">
          <select
            value={selectedFarmId}
            onChange={(e) => onFarmChange(e.target.value)}
            className="w-full text-xs rounded-lg border border-earth-200 bg-white px-2.5 py-1.5 text-earth-800 focus:outline-none focus:ring-1 focus:ring-farm-600 focus:border-farm-600"
            aria-label="Filter by Farm"
          >
            <option value="all">All Farms</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Work Trade Filter */}
        <div className="w-44">
          <select
            value={selectedWorkType}
            onChange={(e) => onWorkTypeChange(e.target.value)}
            className="w-full text-xs rounded-lg border border-earth-200 bg-white px-2.5 py-1.5 text-earth-800 focus:outline-none focus:ring-1 focus:ring-farm-600 focus:border-farm-600"
            aria-label="Filter by Work Role"
          >
            <option value="all">All Roles & Trades</option>
            {WORK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResetFilters}
            className="h-7 text-xs px-2 text-earth-600 hover:text-earth-900 ml-auto"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>
    </div>
  );
}
