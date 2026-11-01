import React from "react";
import { Equipment } from "@/types";
import { EquipmentStatusBadge } from "./EquipmentStatusBadge";
import { EquipmentConditionBadge } from "./EquipmentConditionBadge";
import {
  Wrench,
  Eye,
  Edit,
  Trash2,
  Calendar,
  AlertTriangle,
  Clock,
  Sparkles,
  MapPin,
  Tag,
} from "lucide-react";

interface EquipmentTableProps {
  equipmentList: Equipment[];
  isLoading?: boolean;
  onViewDetails: (equipment: Equipment) => void;
  onEdit: (equipment: Equipment) => void;
  onAddMaintenance: (equipment: Equipment) => void;
  onDelete: (equipment: Equipment) => void;
  onStatusChangeQuick?: (equipment: Equipment, newStatus: string) => void;
}

export function EquipmentTable({
  equipmentList,
  isLoading = false,
  onViewDetails,
  onEdit,
  onAddMaintenance,
  onDelete,
  onStatusChangeQuick,
}: EquipmentTableProps) {
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-xs">
        <div className="p-8 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="h-10 w-10 bg-earth-100 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-earth-100 rounded w-1/4" />
                <div className="h-3 bg-earth-100 rounded w-1/3" />
              </div>
              <div className="h-6 w-20 bg-earth-100 rounded-full" />
              <div className="h-8 w-16 bg-earth-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (equipmentList.length === 0) {
    return null; // Empty state handled by parent
  }

  return (
    <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-earth-700">
          <thead className="bg-earth-50/75 border-b border-earth-200 text-xs uppercase font-semibold text-earth-500 tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Equipment / Machine</th>
              <th className="px-4 py-3.5">Type & Allocation</th>
              <th className="px-4 py-3.5">Condition</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Purchase Details</th>
              <th className="px-4 py-3.5">Next Service</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-earth-100">
            {equipmentList.map((item) => {
              const isOverdue = item.service_status === "overdue";
              const isDueSoon = item.service_status === "due_soon";
              const isUpcoming = item.service_status === "upcoming";

              return (
                <tr
                  key={item.id}
                  className="hover:bg-earth-50/50 transition-colors group"
                >
                  {/* 1. Equipment Details */}
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-farm-50 text-farm-700 border border-farm-200/60 flex items-center justify-center shrink-0 mt-0.5">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div>
                        <button
                          onClick={() => onViewDetails(item)}
                          className="font-semibold text-earth-900 hover:text-farm-600 transition-colors text-left"
                        >
                          {item.equipment_name}
                        </button>
                        <div className="text-xs text-earth-500 flex items-center gap-2 mt-0.5">
                          {item.brand && <span>{item.brand}</span>}
                          {item.model_number && <span>• {item.model_number}</span>}
                          {item.identification_number && (
                            <span className="font-mono bg-earth-100 px-1 py-0.2 rounded text-[11px]">
                              {item.identification_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* 2. Type & Station */}
                  <td className="px-4 py-4">
                    <div className="text-xs font-medium text-earth-900">
                      {item.equipment_type}
                    </div>
                    <div className="text-xs text-earth-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-earth-400" />
                      <span>{item.farm_name || "Unassigned Farm"}</span>
                      {item.field_name && (
                        <span className="text-farm-600 font-medium">
                          ({item.field_name})
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 3. Physical Condition */}
                  <td className="px-4 py-4">
                    <EquipmentConditionBadge condition={item.condition} size="sm" />
                  </td>

                  {/* 4. Operational Status */}
                  <td className="px-4 py-4">
                    <EquipmentStatusBadge status={item.operational_status} size="sm" />
                  </td>

                  {/* 5. Purchase Information */}
                  <td className="px-4 py-4">
                    <div className="font-medium text-earth-900 text-xs">
                      {formatInr(item.purchase_price)}
                    </div>
                    <div className="text-xs text-earth-500 mt-0.5">
                      {item.purchase_date ? formatDate(item.purchase_date) : "Date unknown"}
                    </div>
                  </td>

                  {/* 6. Service Schedule & Countdown */}
                  <td className="px-4 py-4">
                    {item.operational_status === "retired" ? (
                      <span className="text-xs text-earth-400 italic">Retired implement</span>
                    ) : item.next_service_date ? (
                      <div>
                        <div className="flex items-center gap-1 text-xs font-medium">
                          {isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <AlertTriangle className="h-3 w-3" />
                              Overdue ({formatDate(item.next_service_date)})
                            </span>
                          ) : isDueSoon ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="h-3 w-3" />
                              Due Soon ({formatDate(item.next_service_date)})
                            </span>
                          ) : (
                            <span className="text-earth-700">
                              {formatDate(item.next_service_date)}
                            </span>
                          )}
                        </div>
                        {item.last_service_date && (
                          <div className="text-[11px] text-earth-400 mt-0.5">
                            Last: {formatDate(item.last_service_date)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-earth-400 italic">
                        Not scheduled
                      </span>
                    )}
                  </td>

                  {/* 7. Action Buttons */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* View Details */}
                      <button
                        onClick={() => onViewDetails(item)}
                        title="View Details & Maintenance History"
                        className="p-1.5 text-earth-500 hover:text-earth-900 hover:bg-earth-100 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Add Maintenance */}
                      <button
                        onClick={() => onAddMaintenance(item)}
                        title="Record Maintenance / Service"
                        className="p-1.5 text-earth-500 hover:text-farm-600 hover:bg-farm-50 rounded-lg transition-colors"
                      >
                        <Wrench className="h-4 w-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => onEdit(item)}
                        title="Edit Equipment"
                        className="p-1.5 text-earth-500 hover:text-harvest-700 hover:bg-harvest-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => onDelete(item)}
                        title="Delete Equipment"
                        className="p-1.5 text-earth-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
