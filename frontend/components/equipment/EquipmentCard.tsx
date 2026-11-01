import React from "react";
import { Equipment } from "@/types";
import { EquipmentStatusBadge } from "./EquipmentStatusBadge";
import { EquipmentConditionBadge } from "./EquipmentConditionBadge";
import {
  Wrench,
  Calendar,
  AlertTriangle,
  Clock,
  Eye,
  Edit,
  Trash2,
  MapPin,
  IndianRupee,
  Layers,
} from "lucide-react";

interface EquipmentCardProps {
  equipment: Equipment;
  onViewDetails: (equipment: Equipment) => void;
  onEdit: (equipment: Equipment) => void;
  onAddMaintenance: (equipment: Equipment) => void;
  onDelete: (equipment: Equipment) => void;
}

export function EquipmentCard({
  equipment,
  onViewDetails,
  onEdit,
  onAddMaintenance,
  onDelete,
}: EquipmentCardProps) {
  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "—";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
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
    <div className="bg-white rounded-xl border border-earth-200 p-5 shadow-xs hover:shadow-md hover:border-earth-300 transition-all flex flex-col justify-between group">
      {/* Top Section */}
      <div>
        {/* Header: Status and Condition */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <EquipmentStatusBadge status={equipment.operational_status} size="sm" />
          <EquipmentConditionBadge condition={equipment.condition} size="sm" />
        </div>

        {/* Title & Brand */}
        <div className="flex items-start gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-farm-50 text-farm-700 border border-farm-200/60 flex items-center justify-center shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3
              onClick={() => onViewDetails(equipment)}
              className="font-bold text-earth-900 group-hover:text-farm-600 transition-colors cursor-pointer leading-snug"
            >
              {equipment.equipment_name}
            </h3>
            <div className="text-xs text-earth-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-earth-700">{equipment.equipment_type}</span>
              {equipment.brand && <span>• {equipment.brand}</span>}
              {equipment.model_number && <span>• {equipment.model_number}</span>}
            </div>
          </div>
        </div>

        {/* Farm & Location */}
        <div className="flex items-center gap-1 text-xs text-earth-600 mb-3 bg-earth-50/70 p-2 rounded-lg">
          <MapPin className="h-3.5 w-3.5 text-earth-400 shrink-0" />
          <span className="truncate">{equipment.farm_name || "Unassigned Farm"}</span>
          {equipment.field_name && (
            <span className="text-farm-600 font-medium">({equipment.field_name})</span>
          )}
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs border-t border-earth-100 pt-3 mb-3">
          <div>
            <span className="text-earth-400 block text-[11px]">Purchase Price</span>
            <span className="font-semibold text-earth-900">
              {formatInr(equipment.purchase_price)}
            </span>
          </div>
          <div>
            <span className="text-earth-400 block text-[11px]">Quantity</span>
            <span className="font-semibold text-earth-900">
              {equipment.quantity} unit{equipment.quantity > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Service Schedule Banner */}
        <div className="pt-2 border-t border-earth-100">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-earth-500 font-medium flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-earth-400" />
              Next Service:
            </span>
            {equipment.operational_status === "retired" ? (
              <span className="text-earth-400 italic">Retired</span>
            ) : equipment.next_service_date ? (
              <span
                className={`font-semibold ${
                  isOverdue
                    ? "text-rose-600 font-bold"
                    : isDueSoon
                    ? "text-amber-600 font-bold"
                    : "text-earth-800"
                }`}
              >
                {formatDate(equipment.next_service_date)}
              </span>
            ) : (
              <span className="text-earth-400 italic">Not Scheduled</span>
            )}
          </div>

          {isOverdue && (
            <div className="flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 mt-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>Service is overdue! Schedule repair soon.</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="pt-4 border-t border-earth-100 flex items-center justify-between mt-3 text-xs">
        <span className="text-earth-500">
          <strong className="text-earth-700 font-semibold">
            {equipment.maintenance_count}
          </strong>{" "}
          services recorded
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddMaintenance(equipment)}
            title="Log Service / Maintenance"
            className="p-1.5 text-earth-600 hover:text-farm-700 hover:bg-farm-50 rounded-lg transition-colors"
          >
            <Wrench className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewDetails(equipment)}
            title="View Details"
            className="p-1.5 text-earth-600 hover:text-earth-900 hover:bg-earth-100 rounded-lg transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(equipment)}
            title="Edit Details"
            className="p-1.5 text-earth-600 hover:text-harvest-700 hover:bg-harvest-50 rounded-lg transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(equipment)}
            title="Delete / Retire"
            className="p-1.5 text-earth-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
