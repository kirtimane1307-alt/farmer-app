import React from "react";
import { Farm } from "@/types";
import { Search, X } from "lucide-react";

interface IncomeFiltersProps {
  farms: Farm[];
  selectedFarmId: string;
  onFarmChange: (id: string) => void;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
}

export function IncomeFilters({
  farms,
  selectedFarmId,
  onFarmChange,
  selectedCategory,
  onCategoryChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  searchQuery,
  onSearchChange,
  onClearFilters,
}: IncomeFiltersProps) {
  const hasActiveFilters =
    Boolean(selectedFarmId) ||
    Boolean(selectedCategory) ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(searchQuery.trim());

  return (
    <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        {/* Search */}
        <div className="lg:col-span-4">
          <label className="block text-xs font-medium text-earth-700 mb-1">
            Search Other Income
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-earth-400" />
            <input
              type="text"
              placeholder="Description, payer, reference..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Farm */}
        <div className="lg:col-span-3">
          <label className="block text-xs font-medium text-earth-700 mb-1">
            Farm Estate
          </label>
          <select
            value={selectedFarmId}
            onChange={(e) => onFarmChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white"
          >
            <option value="">All Farms</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-earth-700 mb-1">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white"
          >
            <option value="">All Categories</option>
            <option value="government_subsidy">Government Subsidy</option>
            <option value="insurance_compensation">Insurance Compensation</option>
            <option value="equipment_rental">Equipment Rental</option>
            <option value="land_lease">Land Lease</option>
            <option value="scrap_byproduct">Scrap & By-product</option>
            <option value="agro_tourism">Agro-Tourism</option>
            <option value="consulting">Consulting & Training</option>
            <option value="miscellaneous">Miscellaneous</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="lg:col-span-1.5">
          <label className="block text-xs font-medium text-earth-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full px-2.5 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
          />
        </div>

        {/* End Date & Reset */}
        <div className="lg:col-span-1.5 flex items-center gap-1.5">
          <div className="flex-1">
            <label className="block text-xs font-medium text-earth-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              title="Clear all filters"
              className="h-9 w-9 mt-5 rounded-lg border border-earth-300 text-earth-500 hover:text-earth-800 hover:bg-earth-100 flex items-center justify-center shrink-0 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default IncomeFilters;
