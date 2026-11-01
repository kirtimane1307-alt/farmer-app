"use client";

import React, { useEffect, useState } from "react";
import { ReportCategoryKey, DatePresetKey, ReportFilterOptions, Farm, Field } from "@/types";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { Button } from "@/components/ui/Button";
import {
  Calendar,
  Filter,
  RotateCcw,
  RefreshCw,
  Tractor,
  Layers,
  ChevronDown,
} from "lucide-react";

interface ReportFilterBarProps {
  category: ReportCategoryKey;
  filters: ReportFilterOptions;
  onFilterChange: (newFilters: Partial<ReportFilterOptions>) => void;
  onGenerate: () => void;
  onReset: () => void;
  loading: boolean;
}

const DATE_PRESETS: { key: DatePresetKey; label: string }[] = [
  { key: "all_time", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "last_7_days", label: "Last 7 Days" },
  { key: "last_30_days", label: "Last 30 Days" },
  { key: "this_month", label: "This Month" },
  { key: "previous_month", label: "Previous Month" },
  { key: "this_year", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

const EXPENSE_CATEGORIES = [
  { value: "", label: "All Expense Categories" },
  { value: "seeds", label: "Seeds" },
  { value: "fertilizer", label: "Fertilizer" },
  { value: "pesticide", label: "Pesticide" },
  { value: "labour", label: "Labour" },
  { value: "irrigation", label: "Irrigation" },
  { value: "fuel", label: "Fuel" },
  { value: "equipment", label: "Equipment" },
  { value: "maintenance_and_repairs", label: "Maintenance & Repairs" },
  { value: "transportation", label: "Transportation" },
  { value: "electricity", label: "Electricity" },
  { value: "other", label: "Other Expenses" },
];

export function ReportFilterBar({
  category,
  filters,
  onFilterChange,
  onGenerate,
  onReset,
  loading,
}: ReportFilterBarProps) {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(false);

  // Load farms on mount
  useEffect(() => {
    async function loadFarms() {
      setLoadingFarms(true);
      try {
        const res = await farmsApi.getFarms();
        if (res.data) {
          setFarms(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch farms for report filter:", err);
      } finally {
        setLoadingFarms(false);
      }
    }
    loadFarms();
  }, []);

  // Load fields when selected farm changes
  useEffect(() => {
    async function loadFields() {
      if (!filters.farm_id) {
        setFields([]);
        return;
      }
      try {
        const res = await fieldsApi.getFieldsForFarm(filters.farm_id);
        if (res.data) {
          setFields(res.data);
        }
      } catch (err) {
        console.error("Failed to load fields for farm:", err);
      }
    }
    loadFields();
  }, [filters.farm_id]);

  const isCustomDate = filters.preset === "custom";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
      <div className="flex flex-col gap-4">
        {/* Top row: Farm & Date Preset & Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Farm Estate Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Tractor className="h-3.5 w-3.5 text-slate-500" />
              Target Farm Estate
            </label>
            <select
              value={filters.farm_id || ""}
              onChange={(e) => onFilterChange({ farm_id: e.target.value || undefined, field_id: undefined })}
              disabled={loadingFarms}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Registered Farms</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.total_area} {f.area_unit})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Preset Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              Reporting Period Preset
            </label>
            <select
              value={filters.preset || "all_time"}
              onChange={(e) =>
                onFilterChange({
                  preset: e.target.value as DatePresetKey,
                  start_date: e.target.value === "custom" ? filters.start_date : undefined,
                  end_date: e.target.value === "custom" ? filters.end_date : undefined,
                })
              }
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contextual Field Plot Selector (for crop/application/irrigation/harvest/expense) */}
          {["crop", "fertilizer_pesticide", "irrigation", "harvest", "expense"].includes(category) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                Field Plot Filter
              </label>
              <select
                value={filters.field_id || ""}
                onChange={(e) => onFilterChange({ field_id: e.target.value || undefined })}
                disabled={!filters.farm_id}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                <option value="">
                  {filters.farm_id ? "All Fields in Farm" : "Select Farm First"}
                </option>
                {fields.map((fld) => (
                  <option key={fld.id} value={fld.id}>
                    {fld.name} ({fld.area} {fld.area_unit})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Contextual Expense Category Filter */}
          {category === "expense" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                Expense Classification
              </label>
              <select
                value={filters.expense_category || ""}
                onChange={(e) => onFilterChange({ expense_category: e.target.value || undefined })}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {EXPENSE_CATEGORIES.map((ec) => (
                  <option key={ec.value} value={ec.value}>
                    {ec.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Contextual Chemical Category Filter */}
          {category === "fertilizer_pesticide" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                Input Category
              </label>
              <select
                value={filters.expense_category || ""}
                onChange={(e) => onFilterChange({ expense_category: e.target.value || undefined })}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Fertilizers & Pesticides</option>
                <option value="fertilizer">Fertilizers Only</option>
                <option value="pesticide">Pesticides Only</option>
              </select>
            </div>
          )}

          {/* Contextual Crop Status */}
          {category === "crop" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                Crop Status
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Crop Statuses</option>
                <option value="planned">Planned</option>
                <option value="growing">Growing / Active</option>
                <option value="ready_to_harvest">Ready to Harvest</option>
                <option value="harvested">Harvested</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          )}

          {/* Contextual Machinery Status */}
          {category === "machinery" && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                Operational Status
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Operational States</option>
                <option value="available">Available</option>
                <option value="in_use">In Use</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          )}

          {/* Contextual Payment Status (for Salary or Sales) */}
          {["salary", "sales_income"].includes(category) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-slate-500" />
                Payment Status
              </label>
              <select
                value={filters.status || ""}
                onChange={(e) => onFilterChange({ status: e.target.value || undefined })}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">All Payment Statuses</option>
                <option value="paid">Fully Paid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="unpaid">Unpaid / Pending</option>
              </select>
            </div>
          )}

          {/* Action Buttons: Generate & Reset */}
          <div className="flex items-end gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onGenerate}
              disabled={loading}
              className="flex-1 text-xs"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  Generate Report
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              disabled={loading}
              className="text-xs px-3"
              title="Reset Filters to Default"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Custom Date Range Row (visible only when 'custom' is selected) */}
        {isCustomDate && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-lg">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Custom Start Date
              </label>
              <input
                type="date"
                value={filters.start_date || ""}
                onChange={(e) => onFilterChange({ start_date: e.target.value || undefined })}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Custom End Date
              </label>
              <input
                type="date"
                value={filters.end_date || ""}
                onChange={(e) => onFilterChange({ end_date: e.target.value || undefined })}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReportFilterBar;
