"use client";

import React from "react";
import { Farm, Labour } from "@/types";
import { Card, Input, Select, Button } from "@/components/ui";
import { Search, RotateCcw, Filter, Calendar } from "lucide-react";

interface SalaryFiltersProps {
  farms: Farm[];
  labourList: Labour[];
  selectedFarmId: string;
  onFarmChange: (farmId: string) => void;
  selectedLabourId: string;
  onLabourChange: (labourId: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onReset: () => void;
}

export function SalaryFilters({
  farms,
  labourList,
  selectedFarmId,
  onFarmChange,
  selectedLabourId,
  onLabourChange,
  selectedStatus,
  onStatusChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  searchQuery,
  onSearchChange,
  onReset,
}: SalaryFiltersProps) {
  const farmOptions = [
    { value: "", label: "All Farms" },
    ...farms.map((f) => ({ value: f.id, label: f.name })),
  ];

  // Filter workers based on selected farm if one is selected
  const availableWorkers = selectedFarmId
    ? labourList.filter((l) => l.farm_id === selectedFarmId)
    : labourList;

  const labourOptions = [
    { value: "", label: "All Workers" },
    ...availableWorkers.map((l) => ({
      value: l.id,
      label: `${l.name} (${l.work_type || "General"})`,
    })),
  ];

  const statusOptions = [
    { value: "", label: "All Payment Statuses" },
    { value: "generated", label: "Unpaid / Generated" },
    { value: "partially_paid", label: "Partially Paid" },
    { value: "paid", label: "Fully Settled (Paid)" },
  ];

  const hasActiveFilters =
    Boolean(selectedFarmId) ||
    Boolean(selectedLabourId) ||
    Boolean(selectedStatus) ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(searchQuery);

  return (
    <Card className="p-4 bg-white border border-earth-200/80 shadow-2xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Farm Filter */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">Estate / Farm</label>
          <Select
            options={farmOptions}
            value={selectedFarmId}
            onChange={(e) => onFarmChange(e.target.value)}
            className="w-full text-xs"
          />
        </div>

        {/* Worker Filter */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">Labourer</label>
          <Select
            options={labourOptions}
            value={selectedLabourId}
            onChange={(e) => onLabourChange(e.target.value)}
            className="w-full text-xs"
          />
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">Payment Status</label>
          <Select
            options={statusOptions}
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full text-xs"
          />
        </div>

        {/* Period Start */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">Period From</label>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
          </div>
        </div>

        {/* Period To */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">Period To</label>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
          </div>
        </div>

        {/* Search & Reset */}
        <div className="flex flex-col justify-end gap-1.5">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-earth-400" />
            <input
              type="text"
              placeholder="Search worker/farm..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="block w-full rounded-lg border border-earth-300 pl-8 pr-3 py-2 text-xs text-earth-900 shadow-2xs placeholder:text-earth-400 focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-earth-100 flex items-center justify-between text-xs text-earth-500">
          <span className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-earth-400" />
            Active filters applied
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 text-xs text-earth-600 hover:text-earth-900 px-2"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset All Filters
          </Button>
        </div>
      )}
    </Card>
  );
}
