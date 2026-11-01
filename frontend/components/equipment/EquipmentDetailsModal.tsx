import React, { useState } from "react";
import { Equipment, EquipmentMaintenance } from "@/types";
import { Modal, Button } from "@/components/ui";
import { EquipmentStatusBadge } from "./EquipmentStatusBadge";
import { EquipmentConditionBadge } from "./EquipmentConditionBadge";
import { MaintenanceHistoryTable } from "./MaintenanceHistoryTable";
import {
  Wrench,
  Calendar,
  AlertTriangle,
  Clock,
  IndianRupee,
  MapPin,
  Tag,
  ShieldCheck,
  FileText,
  Edit,
  Plus,
} from "lucide-react";

interface EquipmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  onEdit: (equipment: Equipment) => void;
  onAddMaintenance: (equipment: Equipment) => void;
  onEditMaintenance: (record: EquipmentMaintenance) => void;
  onDeleteMaintenance: (record: EquipmentMaintenance) => void;
}

export function EquipmentDetailsModal({
  isOpen,
  onClose,
  equipment,
  onEdit,
  onAddMaintenance,
  onEditMaintenance,
  onDeleteMaintenance,
}: EquipmentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "financial" | "maintenance">(
    "overview"
  );

  if (!equipment) return null;

  const formatInr = (val?: number | null) => {
    if (val === undefined || val === null) return "Unknown";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Not Recorded";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const isOverdue = equipment.service_status === "overdue";
  const isDueSoon = equipment.service_status === "due_soon";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Equipment Specifications & Service Log"
      size="xl"
    >
      <div className="space-y-6">
        {/* Header Hero Banner */}
        <div className="bg-earth-50 rounded-xl p-4 border border-earth-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-farm-100 text-farm-800 border border-farm-200 flex items-center justify-center shrink-0">
              <Wrench className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-earth-900 leading-tight">
                  {equipment.equipment_name}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 bg-earth-200 text-earth-800 rounded">
                  {equipment.equipment_type}
                </span>
              </div>
              <div className="text-xs text-earth-500 flex items-center gap-2 mt-1">
                {equipment.brand && <span>{equipment.brand}</span>}
                {equipment.model_number && <span>• Model: {equipment.model_number}</span>}
                {equipment.identification_number && (
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-earth-200 text-earth-700">
                    {equipment.identification_number}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <EquipmentConditionBadge condition={equipment.condition} />
            <EquipmentStatusBadge status={equipment.operational_status} />
          </div>
        </div>

        {/* Quick Tabs Navigation */}
        <div className="flex border-b border-earth-200 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-farm-600 text-farm-700 font-bold"
                : "border-transparent text-earth-500 hover:text-earth-800"
            }`}
          >
            <Tag className="h-4 w-4" />
            Overview & Specifications
          </button>
          <button
            onClick={() => setActiveTab("financial")}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "financial"
                ? "border-farm-600 text-farm-700 font-bold"
                : "border-transparent text-earth-500 hover:text-earth-800"
            }`}
          >
            <IndianRupee className="h-4 w-4" />
            Purchase & Asset Value
          </button>
          <button
            onClick={() => setActiveTab("maintenance")}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === "maintenance"
                ? "border-farm-600 text-farm-700 font-bold"
                : "border-transparent text-earth-500 hover:text-earth-800"
            }`}
          >
            <Wrench className="h-4 w-4" />
            Maintenance History ({equipment.maintenance_count})
          </button>
        </div>

        {/* Tab 1: Overview & Specs */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white p-3 rounded-lg border border-earth-200 shadow-2xs">
                <span className="text-earth-400 block text-[11px] uppercase font-semibold">
                  Station Location
                </span>
                <span className="font-semibold text-earth-900 block mt-0.5">
                  {equipment.farm_name || "Unassigned"}
                </span>
                {equipment.field_name && (
                  <span className="text-farm-600 block text-[11px]">
                    Assigned Field: {equipment.field_name}
                  </span>
                )}
              </div>

              <div className="bg-white p-3 rounded-lg border border-earth-200 shadow-2xs">
                <span className="text-earth-400 block text-[11px] uppercase font-semibold">
                  Serial / Chassis Number
                </span>
                <span className="font-mono text-earth-800 font-semibold block mt-0.5">
                  {equipment.serial_number || "—"}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-earth-200 shadow-2xs">
                <span className="text-earth-400 block text-[11px] uppercase font-semibold">
                  Fuel / Power Source
                </span>
                <span className="font-semibold text-earth-900 block mt-0.5">
                  {equipment.fuel_type || "Not Specified"}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-earth-200 shadow-2xs">
                <span className="text-earth-400 block text-[11px] uppercase font-semibold">
                  Fleet Quantity
                </span>
                <span className="font-semibold text-earth-900 block mt-0.5">
                  {equipment.quantity} unit{equipment.quantity > 1 ? "s" : ""}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-earth-200 shadow-2xs">
                <span className="text-earth-400 block text-[11px] uppercase font-semibold">
                  Last Service Conducted
                </span>
                <span className="font-semibold text-earth-900 block mt-0.5">
                  {formatDate(equipment.last_service_date)}
                </span>
              </div>

              <div
                className={`p-3 rounded-lg border shadow-2xs ${
                  isOverdue
                    ? "bg-rose-50 border-rose-200 text-rose-900"
                    : isDueSoon
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-white border-earth-200 text-earth-900"
                }`}
              >
                <span className="text-earth-400 block text-[11px] uppercase font-semibold">
                  Next Service Due
                </span>
                <span className="font-semibold block mt-0.5">
                  {formatDate(equipment.next_service_date)}
                </span>
                {isOverdue && (
                  <span className="text-rose-600 font-semibold text-[11px] flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-3 w-3" /> Overdue! Service immediately.
                  </span>
                )}
                {isDueSoon && (
                  <span className="text-amber-700 font-semibold text-[11px] flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" /> Due within 7 days.
                  </span>
                )}
              </div>
            </div>

            {/* Notes */}
            {equipment.notes && (
              <div className="bg-earth-50/70 p-4 rounded-xl border border-earth-200 text-xs">
                <span className="font-semibold text-earth-700 block mb-1">
                  Specifications & Operating Notes:
                </span>
                <p className="text-earth-600 whitespace-pre-wrap">{equipment.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Financial & Valuation */}
        {activeTab === "financial" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-white p-3 rounded-lg border border-earth-200 shadow-2xs">
                <span className="text-earth-400 block text-[11px] uppercase font-semibold">
                  Purchase Price
                </span>
                <span className="text-lg font-bold text-earth-900 block mt-0.5">
                  {formatInr(equipment.purchase_price)}
                </span>
                <span className="text-[11px] text-earth-400">
                  {equipment.purchase_price !== null ? "Excludes taxes/reg" : "Price unknown"}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-earth-200 shadow-2xs">
                <span className="text-earth-400 block text-[11px] uppercase font-semibold">
                  Purchase Date
                </span>
                <span className="font-semibold text-earth-900 block mt-0.5">
                  {formatDate(equipment.purchase_date)}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-earth-200 shadow-2xs">
                <span className="text-earth-400 block text-[11px] uppercase font-semibold">
                  Supplier / Dealership
                </span>
                <span className="font-semibold text-earth-900 block mt-0.5 truncate">
                  {equipment.supplier_name || "—"}
                </span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-earth-200 shadow-2xs">
                <span className="text-earth-400 block text-[11px] uppercase font-semibold">
                  Warranty Expiry
                </span>
                <span className="font-semibold text-earth-900 block mt-0.5">
                  {formatDate(equipment.warranty_expiry_date)}
                </span>
              </div>
            </div>

            {/* Total Maintenance Expenditure */}
            <div className="bg-farm-50/50 rounded-xl p-4 border border-farm-200 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-farm-800 tracking-wider">
                  Total Recorded Maintenance Cost
                </span>
                <p className="text-xs text-earth-600 mt-0.5">
                  Sum of all {equipment.maintenance_count} servicing and repair logs for this machinery.
                </p>
              </div>
              <div className="text-xl font-bold text-farm-800">
                {formatInr(equipment.total_maintenance_cost)}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Maintenance History */}
        {activeTab === "maintenance" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-earth-600">
                Service, repair, and overhaul logs:
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAddMaintenance(equipment)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Log Service / Repair
              </Button>
            </div>

            <MaintenanceHistoryTable
              records={equipment.maintenance_records || []}
              onEdit={onEditMaintenance}
              onDelete={onDeleteMaintenance}
            />
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-earth-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(equipment)}
          >
            <Edit className="h-3.5 w-3.5 mr-1.5" />
            Edit Profile
          </Button>

          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
