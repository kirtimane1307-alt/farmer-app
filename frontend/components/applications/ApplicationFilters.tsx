"use client";

import React from "react";
import { Farm, Field, Crop } from "@/types";
import { Card, Select, Button } from "@/components/ui";
import { Search, RotateCcw, Filter } from "lucide-react";

interface ApplicationFiltersProps {
  farms: Farm[];
  fields: Field[];
  crops: Crop[];
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  selectedFarmId: string;
  onFarmChange: (farmId: string) => void;
  selectedFieldId: string;
  onFieldChange: (fieldId: string) => void;
  selectedCropId: string;
  onCropChange: (cropId: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onReset: () => void;
  hideCategoryFilter?: boolean;
}

export function ApplicationFilters({
  farms,
  fields,
  crops,
  selectedCategory,
  onCategoryChange,
  selectedFarmId,
  onFarmChange,
  selectedFieldId,
  onFieldChange,
  selectedCropId,
  onCropChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  searchQuery,
  onSearchChange,
  onReset,
  hideCategoryFilter = false,
}: ApplicationFiltersProps) {
  const farmOptions = [
    { value: "", label: "All Farms" },
    ...farms.map((f) => ({ value: f.id, label: f.name })),
  ];

  // Cascaded fields
  const availableFields = selectedFarmId
    ? fields.filter((fi) => fi.farm_id === selectedFarmId)
    : fields;

  const fieldOptions = [
    { value: "", label: "All Fields" },
    ...availableFields.map((fi) => ({ value: fi.id, label: fi.name })),
  ];

  // Cascaded crops
  const availableCrops = selectedFieldId
    ? crops.filter((cr) => cr.field_id === selectedFieldId)
    : crops;

  const cropOptions = [
    { value: "", label: "All Crops" },
    ...availableCrops.map((cr) => ({ value: cr.id, label: `${cr.name} (${cr.variety})` })),
  ];

  const categoryOptions = [
    { value: "", label: "All Categories" },
    { value: "fertilizer", label: "Fertilizer Only" },
    { value: "pesticide", label: "Pesticide Only" },
  ];

  const hasActiveFilters =
    Boolean(selectedCategory) ||
    Boolean(selectedFarmId) ||
    Boolean(selectedFieldId) ||
    Boolean(selectedCropId) ||
    Boolean(startDate) ||
    Boolean(endDate) ||
    Boolean(searchQuery);

  return (
    <Card className="p-4 bg-white border border-earth-200/80 shadow-2xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Category Filter (if visible) */}
        {!hideCategoryFilter && (
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">Category</label>
            <Select
              options={categoryOptions}
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full text-xs"
            />
          </div>
        )}

        {/* Farm Filter */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">Farm Estate</label>
          <Select
            options={farmOptions}
            value={selectedFarmId}
            onChange={(e) => {
              onFarmChange(e.target.value);
              onFieldChange("");
              onCropChange("");
            }}
            className="w-full text-xs"
          />
        </div>

        {/* Field Filter */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">Field Plot</label>
          <Select
            options={fieldOptions}
            value={selectedFieldId}
            onChange={(e) => {
              onFieldChange(e.target.value);
              onCropChange("");
            }}
            className="w-full text-xs"
          />
        </div>

        {/* Crop Filter */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">Target Crop</label>
          <Select
            options={cropOptions}
            value={selectedCropId}
            onChange={(e) => onCropChange(e.target.value)}
            className="w-full text-xs"
          />
        </div>

        {/* Date From */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">Date From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">Date To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
          />
        </div>

        {/* Search */}
        <div className={hideCategoryFilter ? "xl:col-span-2" : "xl:col-span-6"}>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-earth-400" />
            <input
              type="text"
              placeholder="Search product, nutrient, target pest, field..."
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
