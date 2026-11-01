import React from "react";
import { Farm, Field, Crop, HarvestFilterParams } from "@/types";
import { Search, Filter, RotateCcw, Calendar } from "lucide-react";
import { Input, Select, Button } from "@/components/ui";

interface HarvestFiltersProps {
  filters: HarvestFilterParams;
  onFilterChange: (newFilters: Partial<HarvestFilterParams>) => void;
  onReset: () => void;
  farms: Farm[];
  fields: Field[];
  crops: Crop[];
  availableUnits?: string[];
}

export function HarvestFilters({
  filters,
  onFilterChange,
  onReset,
  farms,
  fields,
  crops,
  availableUnits = ["kg", "quintals", "tonnes", "bags", "crates", "pieces"],
}: HarvestFiltersProps) {
  // Cascading fields: Filter fields based on selected farm
  const filteredFields = filters.farm_id
    ? fields.filter((f) => f.farm_id === filters.farm_id)
    : fields;

  // Cascading crops: Filter crops based on selected field or selected farm
  const filteredCrops = crops.filter((c) => {
    if (filters.field_id) return c.field_id === filters.field_id;
    if (filters.farm_id) {
      const fieldIdsForFarm = new Set(
        fields.filter((f) => f.farm_id === filters.farm_id).map((f) => f.id)
      );
      return fieldIdsForFarm.has(c.field_id);
    }
    return true;
  });

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.farm_id ||
      filters.field_id ||
      filters.crop_id ||
      filters.unit ||
      filters.quality_grade ||
      filters.start_date ||
      filters.end_date
  );

  return (
    <div className="bg-white p-4 rounded-xl border border-earth-200 shadow-2xs mb-6 space-y-3">
      {/* Top row: Search input + Farm, Field, Crop selects */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Input
            placeholder="Search crop, variety, storage, batch..."
            value={filters.search || ""}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="pl-9"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-earth-400" />
        </div>

        {/* Farm Select */}
        <Select
          value={filters.farm_id || ""}
          onChange={(e) =>
            onFilterChange({
              farm_id: e.target.value || undefined,
              field_id: undefined,
              crop_id: undefined,
            })
          }
        >
          <option value="">All Farms</option>
          {farms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>

        {/* Field Select */}
        <Select
          value={filters.field_id || ""}
          onChange={(e) =>
            onFilterChange({
              field_id: e.target.value || undefined,
              crop_id: undefined,
            })
          }
        >
          <option value="">All Field Plots</option>
          {filteredFields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>

        {/* Crop Select */}
        <Select
          value={filters.crop_id || ""}
          onChange={(e) => onFilterChange({ crop_id: e.target.value || undefined })}
        >
          <option value="">All Crops</option>
          {filteredCrops.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.variety})
            </option>
          ))}
        </Select>
      </div>

      {/* Second row: Grade, Unit, Date Range, Reset Button */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1 border-t border-earth-100">
        {/* Quality Grade Select */}
        <Select
          value={filters.quality_grade || ""}
          onChange={(e) => onFilterChange({ quality_grade: e.target.value || undefined })}
        >
          <option value="">All Quality Grades</option>
          <option value="Grade A">Grade A / Premium</option>
          <option value="Grade B">Grade B</option>
          <option value="Grade C">Grade C</option>
          <option value="Standard">Standard</option>
          <option value="Rejected">Rejected</option>
          <option value="Not specified">Not specified</option>
        </Select>

        {/* Unit Select */}
        <Select
          value={filters.unit || ""}
          onChange={(e) => onFilterChange({ unit: e.target.value || undefined })}
        >
          <option value="">All Units</option>
          {availableUnits.map((u) => (
            <option key={u} value={u}>
              {u.toUpperCase()}
            </option>
          ))}
        </Select>

        {/* Date From */}
        <div className="relative">
          <Input
            type="date"
            value={filters.start_date || ""}
            onChange={(e) => onFilterChange({ start_date: e.target.value || undefined })}
            placeholder="From Date"
            title="Harvest Start Date"
          />
        </div>

        {/* Date To & Reset */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="date"
              value={filters.end_date || ""}
              onChange={(e) => onFilterChange({ end_date: e.target.value || undefined })}
              placeholder="To Date"
              title="Harvest End Date"
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-earth-600 hover:text-earth-900 border-earth-300"
              title="Reset all filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
