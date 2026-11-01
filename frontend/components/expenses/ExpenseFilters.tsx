import React from "react";
import { Farm, Field, Crop, ExpenseCategory } from "@/types";
import { Search, Filter, RotateCcw, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui";

const CATEGORY_OPTIONS: { value: ExpenseCategory | ""; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "labour", label: "Labour" },
  { value: "fertilizer", label: "Fertilizer" },
  { value: "pesticide", label: "Pesticide" },
  { value: "seeds", label: "Seeds" },
  { value: "irrigation", label: "Irrigation" },
  { value: "fuel", label: "Fuel" },
  { value: "equipment", label: "Equipment" },
  { value: "maintenance_and_repairs", label: "Maintenance & Repairs" },
  { value: "transportation", label: "Transportation" },
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "rent_and_leasing", label: "Rent & Leasing" },
  { value: "other", label: "Other" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "All Payment Statuses" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "unpaid", label: "Unpaid" },
];

interface ExpenseFiltersProps {
  farms: Farm[];
  fields: Field[];
  crops: Crop[];
  selectedFarmId: string;
  onSelectFarm: (farmId: string) => void;
  selectedFieldId: string;
  onSelectField: (fieldId: string) => void;
  selectedCropId: string;
  onSelectCrop: (cropId: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  selectedPaymentStatus: string;
  onSelectPaymentStatus: (status: string) => void;
  startDate: string;
  onSelectStartDate: (date: string) => void;
  endDate: string;
  onSelectEndDate: (date: string) => void;
  searchQuery: string;
  onSearchChange: (search: string) => void;
  onReset: () => void;
  onExportCsv: () => void;
  isExporting?: boolean;
}

export function ExpenseFilters({
  farms,
  fields,
  crops,
  selectedFarmId,
  onSelectFarm,
  selectedFieldId,
  onSelectField,
  selectedCropId,
  onSelectCrop,
  selectedCategory,
  onSelectCategory,
  selectedPaymentStatus,
  onSelectPaymentStatus,
  startDate,
  onSelectStartDate,
  endDate,
  onSelectEndDate,
  searchQuery,
  onSearchChange,
  onReset,
  onExportCsv,
  isExporting = false,
}: ExpenseFiltersProps) {
  // Filter plots based on selected farm
  const availableFields = selectedFarmId
    ? fields.filter((f) => f.farm_id === selectedFarmId)
    : fields;

  // Filter crops based on selected field or farm
  const availableCrops = selectedFieldId
    ? crops.filter((c) => c.field_id === selectedFieldId)
    : crops;

  const hasActiveFilters = Boolean(
    selectedFarmId ||
      selectedFieldId ||
      selectedCropId ||
      selectedCategory ||
      selectedPaymentStatus ||
      startDate ||
      endDate ||
      searchQuery
  );

  return (
    <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs mb-6 space-y-4">
      {/* Top Search & Export Row */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-earth-400" />
          <input
            type="text"
            placeholder="Search by expense title, vendor, invoice #, or notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs md:text-sm rounded-lg border border-earth-300 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600 bg-white placeholder-earth-400 text-earth-900"
          />
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-earth-600 hover:text-earth-900 bg-earth-50 hover:bg-earth-100 rounded-lg border border-earth-200 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            disabled={isExporting}
            className="text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>

      {/* Filter Selectors Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-3 border-t border-earth-100 text-xs">
        {/* Farm Estate */}
        <div>
          <label className="block text-[11px] font-semibold text-earth-700 mb-1">
            Farm Estate
          </label>
          <select
            value={selectedFarmId}
            onChange={(e) => {
              onSelectFarm(e.target.value);
              onSelectField("");
              onSelectCrop("");
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border border-earth-300 bg-white text-earth-800 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
          >
            <option value="">All Farms</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Field Plot */}
        <div>
          <label className="block text-[11px] font-semibold text-earth-700 mb-1">
            Field Plot
          </label>
          <select
            value={selectedFieldId}
            onChange={(e) => {
              onSelectField(e.target.value);
              onSelectCrop("");
            }}
            className="w-full px-2.5 py-1.5 rounded-lg border border-earth-300 bg-white text-earth-800 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
          >
            <option value="">All Plots</option>
            {availableFields.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Crop Cycle */}
        <div>
          <label className="block text-[11px] font-semibold text-earth-700 mb-1">
            Crop Cycle
          </label>
          <select
            value={selectedCropId}
            onChange={(e) => onSelectCrop(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-earth-300 bg-white text-earth-800 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
          >
            <option value="">All Crops</option>
            {availableCrops.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.variety})
              </option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div>
          <label className="block text-[11px] font-semibold text-earth-700 mb-1">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => onSelectCategory(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-earth-300 bg-white text-earth-800 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Status */}
        <div>
          <label className="block text-[11px] font-semibold text-earth-700 mb-1">
            Payment Status
          </label>
          <select
            value={selectedPaymentStatus}
            onChange={(e) => onSelectPaymentStatus(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-earth-300 bg-white text-earth-800 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
          >
            {PAYMENT_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-[11px] font-semibold text-earth-700 mb-1">
            Date From
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onSelectStartDate(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-earth-300 bg-white text-earth-800 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-[11px] font-semibold text-earth-700 mb-1">
            Date To
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onSelectEndDate(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-earth-300 bg-white text-earth-800 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
          />
        </div>
      </div>
    </div>
  );
}
