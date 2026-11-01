import React from "react";
import { EquipmentMaintenance } from "@/types";
import {
  Wrench,
  Calendar,
  Clock,
  IndianRupee,
  Edit,
  Trash2,
  User,
  Package,
} from "lucide-react";

interface MaintenanceHistoryTableProps {
  records: EquipmentMaintenance[];
  isLoading?: boolean;
  onEdit: (record: EquipmentMaintenance) => void;
  onDelete: (record: EquipmentMaintenance) => void;
}

export function MaintenanceHistoryTable({
  records,
  isLoading = false,
  onEdit,
  onDelete,
}: MaintenanceHistoryTableProps) {
  const formatInr = (val?: number | null) => {
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

  const formatDowntime = (mins?: number | null) => {
    if (!mins) return "—";
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours === 0) return `${mins}m`;
    if (remMins === 0) return `${hours}h`;
    return `${hours}h ${remMins}m`;
  };

  const getMaintenanceBadge = (typeStr: string) => {
    const type = typeStr.toLowerCase();
    const config = {
      routine_service: "bg-blue-50 text-blue-700 border-blue-200",
      preventive_maintenance: "bg-teal-50 text-teal-700 border-teal-200",
      repair: "bg-amber-50 text-amber-800 border-amber-200",
      inspection: "bg-indigo-50 text-indigo-700 border-indigo-200",
      parts_replacement: "bg-purple-50 text-purple-700 border-purple-200",
      other: "bg-slate-100 text-slate-700 border-slate-300",
    }[type] || "bg-earth-100 text-earth-700 border-earth-300";

    const label = typeStr.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${config}`}
      >
        {label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-xs text-earth-500 animate-pulse">
        Loading maintenance history...
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="p-8 text-center bg-earth-50/50 rounded-xl border border-dashed border-earth-200">
        <Wrench className="h-8 w-8 text-earth-400 mx-auto mb-2 opacity-60" />
        <p className="text-xs font-semibold text-earth-700">No service records found</p>
        <p className="text-xs text-earth-500 mt-0.5">
          Log routine oil changes, seasonal overhauls, or emergency repairs for this machine.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-earth-200 rounded-xl bg-white shadow-2xs">
      <table className="w-full text-left text-xs text-earth-700">
        <thead className="bg-earth-50/75 border-b border-earth-200 text-earth-500 uppercase font-semibold tracking-wider text-[11px]">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-3 py-3">Service Type</th>
            <th className="px-4 py-3">Description & Parts</th>
            <th className="px-3 py-3">Mechanic / Workshop</th>
            <th className="px-3 py-3">Cost (₹)</th>
            <th className="px-3 py-3">Downtime</th>
            <th className="px-3 py-3">Next Scheduled</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-earth-100">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-earth-50/50 transition-colors">
              <td className="px-4 py-3 font-medium text-earth-900 whitespace-nowrap">
                {formatDate(r.service_date)}
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                {getMaintenanceBadge(r.maintenance_type)}
              </td>
              <td className="px-4 py-3 max-w-xs">
                <div className="font-medium text-earth-900 leading-snug">
                  {r.description}
                </div>
                {r.parts_replaced && (
                  <div className="text-[11px] text-earth-500 flex items-center gap-1 mt-0.5">
                    <Package className="h-3 w-3 text-earth-400 shrink-0" />
                    <span className="truncate">{r.parts_replaced}</span>
                  </div>
                )}
                {r.notes && (
                  <div className="text-[11px] text-earth-400 italic mt-0.5 truncate">
                    {r.notes}
                  </div>
                )}
              </td>
              <td className="px-3 py-3 text-earth-600 whitespace-nowrap">
                {r.service_provider ? (
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3 text-earth-400" />
                    {r.service_provider}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-3 font-semibold text-earth-900 whitespace-nowrap">
                {formatInr(r.cost)}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-earth-600">
                {formatDowntime(r.downtime_minutes)}
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-earth-600">
                {formatDate(r.next_service_date)}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => onEdit(r)}
                    title="Edit Service Record"
                    className="p-1 text-earth-500 hover:text-earth-900 hover:bg-earth-100 rounded transition-colors"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(r)}
                    title="Delete Service Record"
                    className="p-1 text-earth-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
