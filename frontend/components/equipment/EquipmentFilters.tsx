import React from "react";
import { Farm, Field } from "@/types";
import { Search, X, Filter, RotateCcw } from "lucide-react";

interface EquipmentFiltersProps {
  farms: Farm[];
  fields: Field[];
  selectedFarmId: string;
  selectedFieldId: string;
  selectedType: string;
  selectedStatus: string;
  selectedCondition: string;
  selectedServiceStatus: string;
  searchQuery: string;
  onFarmChange: (farmId: string) => void;
  onFieldChange: (fieldId: string) => void;
  onTypeChange: (type: string) => void;
  onStatusChange: (status: string) => void;
  onConditionChange: (condition: string) => void;
  onServiceStatusChange: (serviceStatus: string) => void;
  onSearchChange: (search: string) => void;
  onReset: () => void;
}

const EQUIPMENT_TYPES = [
  "Tractor",
  "Cultivator",
  "Plough",
  "Harvester",
  "Seed Drill",
  "Sprayer",
  "Water Pump",
  "Drip Irrigation Equipment",
  "Sprinkler System",
  "Power Tiller",
  "Trailer",
  "Other",
];

const SERVICE_TABS = [
  { id: "", label: "All Equipment" },
  { id: "overdue", label: "Overdue Service" },
  { id: "upcoming", label: "Upcoming (30d)" },
  { id: "under_maintenance", label: "Under Maintenance" },
  { id: "retired", label: "Retired" },
];

export function EquipmentFilters({
  farms,
  fields,
  selectedFarmId,
  selectedFieldId,
  selectedType,
  selectedStatus,
  selectedCondition,
  selectedServiceStatus,
  searchQuery,
  onFarmChange,
  onFieldChange,
  onTypeChange,
  onStatusChange,
  onConditionChange,
  onServiceStatusChange,
  onSearchChange,
  onReset,
}: EquipmentFiltersProps) {
  // Filter fields belonging to selected farm
  const availableFields = selectedFarmId
    ? fields.filter((f) => f.farm_id === selectedFarmId)
    : fields;

  const hasActiveFilters =
    Boolean(selectedFarmId) ||
    Boolean(selectedFieldId) ||
    Boolean(selectedType) ||
    Boolean(selectedStatus) ||
    Boolean(selectedCondition) ||
    Boolean(selectedServiceStatus) ||
    Boolean(searchQuery);

  return (
    <div className="bg-white rounded-xl border border-earth-200 p-4 mb-6 shadow-xs space-y-4">
      {/* 1. Quick Service Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-earth-100 pb-3">
        {SERVICE_TABS.map((tab) => {
          const isActive = selectedServiceStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onServiceStatusChange(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                isActive
                  ? "bg-farm-600 text-white shadow-xs"
                  : "bg-earth-50 text-earth-600 hover:bg-earth-100 hover:text-earth-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 2. Filter Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Search Input */}
        <div className="sm:col-span-2 relative">
          <label className="block text-xs font-medium text-earth-600 mb-1">
            Search Implement
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-earth-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search name, brand, model, serial..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white transition-all text-earth-900"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Farm Select */}
        <div>
          <label className="block text-xs font-medium text-earth-600 mb-1">
            Farm Estate
          </label>
          <select
            value={selectedFarmId}
            onChange={(e) => {
              onFarmChange(e.target.value);
              onFieldChange(""); // Reset field if farm changes
            }}
            className="w-full py-2 px-3 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white transition-all text-earth-900"
          >
            <option value="">All Farms</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Field Plot Select */}
        <div>
          <label className="block text-xs font-medium text-earth-600 mb-1">
            Field Plot
          </label>
          <select
            value={selectedFieldId}
            onChange={(e) => onFieldChange(e.target.value)}
            disabled={!selectedFarmId && farms.length > 1}
            className="w-full py-2 px-3 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white transition-all text-earth-900 disabled:opacity-50"
          >
            <option value="">All Fields</option>
            {availableFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Equipment Type Select */}
        <div>
          <label className="block text-xs font-medium text-earth-600 mb-1">
            Equipment Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full py-2 px-3 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white transition-all text-earth-900"
          >
            <option value="">All Types</option>
            {EQUIPMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Operational Status */}
        <div>
          <label className="block text-xs font-medium text-earth-600 mb-1">
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full py-2 px-3 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white transition-all text-earth-900"
          >
            <option value="">All Statuses</option>
            <option value="available">Available</option>
            <option value="in_use">In Use</option>
            <option value="under_maintenance">Under Maintenance</option>
            <option value="retired">Retired</option>
          </select>
        </div>
      </div>

      {/* 3. Bottom Action Row: Condition Filter & Reset */}
      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-earth-100 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-earth-500 font-medium">Condition:</span>
          {["", "excellent", "good", "fair", "poor", "damaged"].map((c) => {
            const isSelected = selectedCondition === c;
            const label = c ? c.charAt(0).toUpperCase() + c.slice(1) : "Any";
            return (
              <button
                key={c}
                onClick={() => onConditionChange(c)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  isSelected
                    ? "bg-earth-800 text-white font-medium"
                    : "text-earth-600 hover:bg-earth-100"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-earth-500 hover:text-earth-800 font-medium transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear All Filters
          </button>
        )}
      </div>
    </div>
  );
}
