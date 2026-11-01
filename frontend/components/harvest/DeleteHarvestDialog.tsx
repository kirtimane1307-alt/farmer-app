import React, { useState } from "react";
import { Modal, Button } from "@/components/ui";
import { Harvest } from "@/types";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteHarvestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  harvest: Harvest | null;
  onConfirm: (harvestId: string) => Promise<void>;
}

export function DeleteHarvestDialog({
  isOpen,
  onClose,
  harvest,
  onConfirm,
}: DeleteHarvestDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!harvest) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      await onConfirm(harvest.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete harvest record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Harvest Record"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Are you sure you want to delete this record?</p>
            <p className="text-rose-700 text-xs leading-relaxed">
              This will remove the harvest log of{" "}
              <span className="font-bold">
                {harvest.quantity} {harvest.unit}
              </span>{" "}
              for <span className="font-bold">{harvest.crop_name}</span> harvested on{" "}
              <span className="font-mono">{harvest.harvest_date}</span>.
            </p>
          </div>
        </div>

        <p className="text-xs text-earth-500">
          Note: This action is safe and will not delete or alter your underlying farm, field, or crop records.
        </p>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-100 text-rose-800 text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-earth-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Yes, Delete Record"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
