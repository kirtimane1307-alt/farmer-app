"use client";

import React from "react";
import { Farm } from "@/types";
import { Input, Button, Select } from "@/components/ui";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  RotateCcw,
  Tractor,
} from "lucide-react";

interface AttendanceFiltersProps {
  selectedDate: string;
  onDateChange: (newDate: string) => void;
  selectedFarmId: string;
  onFarmChange: (farmId: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  farms: Farm[];
  onReset: () => void;
}

export function AttendanceFilters({
  selectedDate,
  onDateChange,
  selectedFarmId,
  onFarmChange,
  selectedStatus,
  onStatusChange,
  searchQuery,
  onSearchChange,
  farms,
  onReset,
}: AttendanceFiltersProps) {
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(d.toISOString().split("T")[0]);
  };

  const handleToday = () => {
    onDateChange(new Date().toISOString().split("T")[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  const statusOptions = [
    { label: "All Statuses", value: "" },
    { label: "Present", value: "present" },
    { label: "Absent", value: "absent" },
    { label: "Half Day", value: "half_day" },
    { label: "On Leave", value: "leave" },
  ];

  const farmOptions = [
    { label: "All Farm Estates", value: "" },
    ...farms.map((f) => ({ label: f.name, value: f.id })),
  ];

  return (
    <div className="p-4 bg-white border border-earth-200 rounded-2xl shadow-2xs space-y-3.5">
      {/* Top Bar: Date Navigator & Farm Selector */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Date Selector with quick steppers */}
        <div className="flex items-center gap-1.5 bg-earth-50 p-1.5 rounded-xl border border-earth-200/80">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevDay}
            className="h-8 w-8 p-0 bg-white border-earth-200 text-earth-700 hover:bg-earth-100"
            title="Previous Day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="h-4 w-4 text-farm-600 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-earth-900 focus:outline-hidden cursor-pointer"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextDay}
            className="h-8 w-8 p-0 bg-white border-earth-200 text-earth-700 hover:bg-earth-100"
            title="Next Day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant={isToday ? "primary" : "outline"}
            size="sm"
            onClick={handleToday}
            className={`h-8 text-xs font-semibold px-2.5 ml-1 ${
              isToday ? "" : "bg-white border-earth-200 text-earth-700"
            }`}
          >
            Today
          </Button>
        </div>

        {/* Farm Estate Filter */}
        <div className="flex items-center gap-2">
          <div className="w-full md:w-60">
            <Select
              value={selectedFarmId}
              onChange={(e) => onFarmChange(e.target.value)}
              options={farmOptions}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-9 text-xs text-earth-600 hover:text-earth-900 border-earth-200 shrink-0"
            title="Reset Filters"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Bottom Bar: Search & Status Filter Pills */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-earth-100">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-earth-400" />
          <input
            type="text"
            placeholder="Search worker by name, trade..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-earth-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-farm-600 focus:border-farm-600"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {statusOptions.map((opt) => {
            const isSelected = selectedStatus === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onStatusChange(opt.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? "bg-farm-600 text-white shadow-2xs"
                    : "bg-earth-100/70 text-earth-700 hover:bg-earth-200/80"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
