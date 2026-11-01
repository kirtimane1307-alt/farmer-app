import React from "react";
import { EquipmentSummary } from "@/types";
import {
  Wrench,
  CheckCircle2,
  PlayCircle,
  AlertTriangle,
  Clock,
  IndianRupee,
  Layers,
  Archive,
} from "lucide-react";

interface EquipmentSummaryCardsProps {
  summary: EquipmentSummary | null;
  isLoading?: boolean;
}

export function EquipmentSummaryCards({
  summary,
  isLoading = false,
}: EquipmentSummaryCardsProps) {
  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const total = summary?.total_equipment || 0;
  const available = summary?.available_count || 0;
  const inUse = summary?.in_use_count || 0;
  const underMaintenance = summary?.under_maintenance_count || 0;
  const retired = summary?.retired_count || 0;
  const overdue = summary?.overdue_services_count || 0;
  const upcoming = summary?.upcoming_services_count || 0;
  const purchaseValue = summary?.total_purchase_value || 0;
  const maintenanceCost = summary?.total_maintenance_cost || 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {/* 1. Total Fleet */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-earth-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Total Machinery
          </span>
          <div className="h-8 w-8 rounded-lg bg-farm-50 text-farm-700 flex items-center justify-center">
            <Layers className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-earth-900 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-16 bg-earth-100 animate-pulse rounded" />
          ) : (
            total
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <span className="font-semibold text-farm-700 mr-1">
            {available + inUse}
          </span>{" "}
          operational implements
        </div>
      </div>

      {/* 2. Available & In-Use */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-earth-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Available / In Use
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-earth-900 tracking-tight flex items-baseline gap-2">
          {isLoading ? (
            <div className="h-8 w-20 bg-earth-100 animate-pulse rounded" />
          ) : (
            <>
              <span className="text-emerald-700">{available}</span>
              <span className="text-xs font-normal text-earth-400">/</span>
              <span className="text-blue-700 text-lg">{inUse}</span>
            </>
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <span className="text-emerald-600 font-medium mr-1">{available} ready</span>
          <span>•</span>
          <span className="text-blue-600 font-medium ml-1">{inUse} deployed</span>
        </div>
      </div>

      {/* 3. Under Maintenance / Repairs */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-earth-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Under Service
          </span>
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              underMaintenance > 0
                ? "bg-amber-50 text-amber-700 animate-pulse"
                : "bg-earth-50 text-earth-500"
            }`}
          >
            <Wrench className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold text-earth-900 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-16 bg-earth-100 animate-pulse rounded" />
          ) : (
            <span className={underMaintenance > 0 ? "text-amber-700" : ""}>
              {underMaintenance}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <span className="font-semibold text-earth-700 mr-1">{retired}</span>{" "}
          retired implements
        </div>
      </div>

      {/* 4. Service Alerts (Overdue / Upcoming) */}
      <div
        className={`bg-white rounded-xl border p-4 shadow-xs relative overflow-hidden group transition-all ${
          overdue > 0
            ? "border-rose-200 bg-rose-50/20"
            : "border-earth-200 hover:border-earth-300"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Maintenance Due
          </span>
          <div
            className={`h-8 w-8 rounded-lg flex items-center justify-center ${
              overdue > 0
                ? "bg-rose-100 text-rose-700"
                : "bg-harvest-50 text-harvest-700"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight flex items-baseline gap-2">
          {isLoading ? (
            <div className="h-8 w-20 bg-earth-100 animate-pulse rounded" />
          ) : (
            <>
              <span className={overdue > 0 ? "text-rose-600 font-extrabold" : "text-earth-900"}>
                {overdue}
              </span>
              <span className="text-xs font-normal text-earth-400">overdue</span>
            </>
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <Clock className="h-3.5 w-3.5 mr-1 text-harvest-600" />
          <span className="font-medium text-harvest-700 mr-1">{upcoming}</span> upcoming (30d)
        </div>
      </div>

      {/* 5. Fleet Valuation & Maintenance Costs */}
      <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs relative overflow-hidden group hover:border-earth-300 transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-earth-500">
            Fleet Asset Value
          </span>
          <div className="h-8 w-8 rounded-lg bg-farm-50 text-farm-700 flex items-center justify-center">
            <IndianRupee className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 text-xl font-bold text-earth-900 tracking-tight">
          {isLoading ? (
            <div className="h-8 w-28 bg-earth-100 animate-pulse rounded" />
          ) : (
            formatInr(purchaseValue)
          )}
        </div>
        <div className="mt-1 flex items-center text-xs text-earth-500">
          <span className="text-earth-600">Total Servicing:</span>
          <span className="font-semibold text-earth-800 ml-1">
            {formatInr(maintenanceCost)}
          </span>
        </div>
      </div>
    </div>
  );
}
