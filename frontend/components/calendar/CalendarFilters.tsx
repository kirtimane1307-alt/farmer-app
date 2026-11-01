import React from "react";
import { Farm, Field, Crop, CalendarActivityType, CalendarEventStatus, CalendarEventPriority } from "@/types";
import { Search, X, Filter, Building, Layers, Wheat, Tag, Clock, AlertTriangle } from "lucide-react";
import { ACTIVITY_TYPE_CONFIG } from "./ActivityTypeBadge";

interface CalendarFiltersProps {
  farms: Farm[];
  fields: Field[];
  crops: Crop[];
  selectedFarmId: string;
  onFarmChange: (farmId: string) => void;
  selectedFieldId: string;
  onFieldChange: (fieldId: string) => void;
  selectedCropId: string;
  onCropChange: (cropId: string) => void;
  selectedActivityType: string;
  onActivityTypeChange: (type: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedPriority: string;
  onPriorityChange: (priority: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClearFilters: () => void;
}

export function CalendarFilters({
  farms,
  fields,
  crops,
  selectedFarmId,
  onFarmChange,
  selectedFieldId,
  onFieldChange,
  selectedCropId,
  onCropChange,
  selectedActivityType,
  onActivityTypeChange,
  selectedStatus,
  onStatusChange,
  selectedPriority,
  onPriorityChange,
  searchQuery,
  onSearchChange,
  onClearFilters,
}: CalendarFiltersProps) {
  // Cascading filters
  const filteredFields = fields.filter((f) => (selectedFarmId ? f.farm_id === selectedFarmId : true));
  const filteredCrops = crops.filter((c) => {
    if (selectedFieldId) return c.field_id === selectedFieldId;
    if (selectedFarmId) {
      const fieldIds = new Set(filteredFields.map((f) => f.id));
      return fieldIds.has(c.field_id);
    }
    return true;
  });

  const hasActiveFilters = Boolean(
    selectedFarmId ||
    selectedFieldId ||
    selectedCropId ||
    selectedActivityType ||
    selectedStatus ||
    selectedPriority ||
    searchQuery.trim()
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6 space-y-3">
      {/* Search Bar + Quick reset */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search activities by title, description, or notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl transition-colors self-start sm:self-auto"
          >
            <X className="h-3.5 w-3.5" />
            Clear Filters
          </button>
        )}
      </div>

      {/* Structured Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-100 text-xs">
        {/* Farm */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Farm
          </label>
          <select
            value={selectedFarmId}
            onChange={(e) => {
              onFarmChange(e.target.value);
              onFieldChange("");
              onCropChange("");
            }}
            className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Farms</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Field */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Field Plot
          </label>
          <select
            value={selectedFieldId}
            onChange={(e) => {
              onFieldChange(e.target.value);
              onCropChange("");
            }}
            className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Fields</option>
            {filteredFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Crop */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Crop
          </label>
          <select
            value={selectedCropId}
            onChange={(e) => onCropChange(e.target.value)}
            className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Crops</option>
            {filteredCrops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.variety || "Standard"})
              </option>
            ))}
          </select>
        </div>

        {/* Activity Type */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Activity Type
          </label>
          <select
            value={selectedActivityType}
            onChange={(e) => onActivityTypeChange(e.target.value)}
            className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Types</option>
            {Object.entries(ACTIVITY_TYPE_CONFIG).map(([typeKey, cfg]) => (
              <option key={typeKey} value={typeKey}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="planned">Planned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Priority
          </label>
          <select
            value={selectedPriority}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="w-full py-1.5 px-2.5 rounded-lg border border-slate-200 text-slate-800 bg-slate-50 focus:bg-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default CalendarFilters;
