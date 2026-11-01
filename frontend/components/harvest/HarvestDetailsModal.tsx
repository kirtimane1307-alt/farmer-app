import React from "react";
import { Modal, Button } from "@/components/ui";
import { Harvest } from "@/types";
import { HarvestQualityBadge } from "./HarvestQualityBadge";
import {
  Wheat,
  MapPin,
  Calendar,
  Layers,
  Scale,
  Warehouse,
  Tag,
  Wrench,
  Clock,
  Pencil,
  Trash2,
} from "lucide-react";

interface HarvestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  harvest: Harvest | null;
  onEdit: (harvest: Harvest) => void;
  onDelete: (harvest: Harvest) => void;
}

export function HarvestDetailsModal({
  isOpen,
  onClose,
  harvest,
  onEdit,
  onDelete,
}: HarvestDetailsModalProps) {
  if (!harvest) return null;

  const qty = Number(harvest.quantity || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Harvest Record Details"
      size="md"
    >
      <div className="space-y-4">
        {/* Header Hero Banner */}
        <div className="bg-earth-50 rounded-xl p-4 border border-earth-200 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-farm-600 text-white shadow-xs">
              <Wheat className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-earth-900 leading-tight">
                {harvest.crop_name || "Crop"}
              </h3>
              <p className="text-xs text-earth-500 font-medium">
                Variety: {harvest.crop_variety || "Standard"}
              </p>
            </div>
          </div>
          <HarvestQualityBadge grade={harvest.quality_grade} size="md" />
        </div>

        {/* Primary Yield Banner */}
        <div className="bg-farm-50/70 border border-farm-200/80 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-farm-700" />
            <span className="text-xs font-semibold text-farm-900 uppercase tracking-wider">
              Recorded Yield
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-farm-950 font-mono">
              {qty.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>{" "}
            <span className="text-sm font-bold text-farm-700 uppercase">
              {harvest.unit}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Farm Estate */}
          <div className="p-3 bg-white rounded-lg border border-earth-200">
            <div className="flex items-center gap-1.5 text-xs text-earth-500 font-medium mb-1">
              <MapPin className="h-3.5 w-3.5 text-earth-400" />
              <span>Farm Estate</span>
            </div>
            <p className="font-semibold text-earth-900 truncate">
              {harvest.farm_name || "Farm"}
            </p>
          </div>

          {/* Field Plot */}
          <div className="p-3 bg-white rounded-lg border border-earth-200">
            <div className="flex items-center gap-1.5 text-xs text-earth-500 font-medium mb-1">
              <Layers className="h-3.5 w-3.5 text-earth-400" />
              <span>Field Plot</span>
            </div>
            <p className="font-semibold text-earth-900 truncate">
              {harvest.field_name || "Field Plot"}
            </p>
          </div>

          {/* Harvest Date */}
          <div className="p-3 bg-white rounded-lg border border-earth-200">
            <div className="flex items-center gap-1.5 text-xs text-earth-500 font-medium mb-1">
              <Calendar className="h-3.5 w-3.5 text-earth-400" />
              <span>Harvest Date</span>
            </div>
            <p className="font-semibold text-earth-900 font-mono">
              {harvest.harvest_date}
            </p>
          </div>

          {/* Harvest Method */}
          <div className="p-3 bg-white rounded-lg border border-earth-200">
            <div className="flex items-center gap-1.5 text-xs text-earth-500 font-medium mb-1">
              <Wrench className="h-3.5 w-3.5 text-earth-400" />
              <span>Harvest Method</span>
            </div>
            <p className="font-semibold text-earth-900">
              {harvest.harvest_method || "Not specified"}
            </p>
          </div>

          {/* Storage Location */}
          <div className="p-3 bg-white rounded-lg border border-earth-200">
            <div className="flex items-center gap-1.5 text-xs text-earth-500 font-medium mb-1">
              <Warehouse className="h-3.5 w-3.5 text-earth-400" />
              <span>Storage Location</span>
            </div>
            <p className="font-semibold text-earth-900 truncate">
              {harvest.storage_location || "Not assigned"}
            </p>
          </div>

          {/* Batch Number */}
          <div className="p-3 bg-white rounded-lg border border-earth-200">
            <div className="flex items-center gap-1.5 text-xs text-earth-500 font-medium mb-1">
              <Tag className="h-3.5 w-3.5 text-earth-400" />
              <span>Batch / Lot Reference</span>
            </div>
            <p className="font-semibold text-earth-900 font-mono truncate">
              {harvest.batch_number || "None"}
            </p>
          </div>
        </div>

        {/* Notes */}
        {harvest.notes && (
          <div className="p-3 bg-earth-50 rounded-lg border border-earth-200">
            <span className="text-xs font-semibold text-earth-600 uppercase tracking-wider block mb-1">
              Agronomic Observations
            </span>
            <p className="text-xs text-earth-800 whitespace-pre-wrap leading-relaxed">
              {harvest.notes}
            </p>
          </div>
        )}

        {/* System Metadata */}
        <div className="flex items-center justify-between text-[11px] text-earth-400 pt-2 border-t border-earth-100">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Recorded: {new Date(harvest.created_at).toLocaleDateString()}</span>
          </div>
          <span className="font-mono text-[10px]">ID: {harvest.id.slice(0, 8)}...</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-earth-100">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onDelete(harvest);
            }}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(harvest);
              }}
              className="bg-farm-600 hover:bg-farm-700 text-white"
            >
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit Harvest
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
