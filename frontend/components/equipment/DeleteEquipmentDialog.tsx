import React, { useState } from "react";
import { Equipment } from "@/types";
import { Modal, Button } from "@/components/ui";
import { AlertTriangle, Archive, Trash2 } from "lucide-react";

interface DeleteEquipmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  onConfirmDelete: (equipment: Equipment, force?: boolean) => Promise<void>;
  onRetireEquipment: (equipment: Equipment) => Promise<void>;
  isLoading?: boolean;
}

export function DeleteEquipmentDialog({
  isOpen,
  onClose,
  equipment,
  onConfirmDelete,
  onRetireEquipment,
  isLoading = false,
}: DeleteEquipmentDialogProps) {
  const [confirmForce, setConfirmForce] = useState(false);

  if (!equipment) return null;

  const hasHistory = (equipment.maintenance_count || 0) > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Equipment Record"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-950">
              Are you sure you want to remove &ldquo;{equipment.equipment_name}&rdquo;?
            </p>
            <p className="mt-1 text-rose-800">
              {hasHistory
                ? `This machine has ${equipment.maintenance_count} historical maintenance and repair logs recorded.`
                : "This equipment record has no logged maintenance history and can be safely deleted."}
            </p>
          </div>
        </div>

        {hasHistory && (
          <div className="p-3 bg-earth-50 border border-earth-200 rounded-xl text-xs text-earth-700 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-earth-900">
              <Archive className="h-4 w-4 text-earth-600" />
              Recommended: Set Status to &ldquo;Retired&rdquo;
            </div>
            <p className="text-earth-600">
              Retiring marks the machine as decommissioned while preserving its complete service history and financial expenditures for accounting audits.
            </p>

            <div className="pt-2 border-t border-earth-200">
              <label className="flex items-center gap-2 cursor-pointer text-earth-700 text-xs">
                <input
                  type="checkbox"
                  checked={confirmForce}
                  onChange={(e) => setConfirmForce(e.target.checked)}
                  className="rounded border-earth-300 text-rose-600 focus:ring-rose-500"
                />
                <span className="font-medium text-rose-700">
                  I understand. Permanently delete equipment and all its service logs.
                </span>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-earth-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>

          {hasHistory && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onRetireEquipment(equipment)}
              disabled={isLoading}
            >
              <Archive className="h-3.5 w-3.5 mr-1" />
              Retire Implement
            </Button>
          )}

          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={() => onConfirmDelete(equipment, confirmForce)}
            disabled={isLoading || (hasHistory && !confirmForce)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {isLoading ? "Deleting..." : "Permanently Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
