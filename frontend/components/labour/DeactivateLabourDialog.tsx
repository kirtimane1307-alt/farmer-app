"use client";

import React, { useState } from "react";
import { Labour } from "@/types";
import { Modal, Button } from "@/components/ui";
import { labourApi } from "@/lib/api/labour";
import { UserX, AlertCircle, ShieldAlert, CheckCircle2 } from "lucide-react";

interface DeactivateLabourDialogProps {
  isOpen: boolean;
  labour: Labour | null;
  onClose: () => void;
  onSuccess: (updatedLabour: Labour | { id: string; deleted: boolean }) => void;
}

export function DeactivateLabourDialog({
  isOpen,
  labour,
  onClose,
  onSuccess,
}: DeactivateLabourDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPermanent, setIsPermanent] = useState(false);

  if (!labour) return null;

  const isActive = labour.status === "active";

  const handleAction = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      if (!isActive && !isPermanent) {
        // If already inactive and user clicks to Reactivate
        const res = await labourApi.updateLabour(labour.id, { status: "active" });
        if (res.error) {
          setError(res.error || "Failed to reactivate worker.");
        } else if (res.data) {
          onSuccess(res.data);
          onClose();
        }
      } else {
        // Deactivate or permanently delete
        const res = await labourApi.deactivateLabour(labour.id, isPermanent);
        if (res.error) {
          setError(res.error || "Failed to process request.");
        } else if (res.data) {
          if (isPermanent) {
            onSuccess({ id: labour.id, deleted: true });
          } else {
            onSuccess({ ...labour, status: "inactive" });
          }
          onClose();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to execute action.";
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isProcessing && onClose()}
      title={
        !isActive && !isPermanent
          ? `Reactivate Worker: ${labour.name}`
          : isPermanent
          ? `Permanently Delete Worker: ${labour.name}`
          : `Deactivate Labour: ${labour.name}`
      }
      size="sm"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={
              !isActive && !isPermanent
                ? "primary"
                : isPermanent
                ? "danger"
                : "secondary"
            }
            size="sm"
            onClick={handleAction}
            isLoading={isProcessing}
          >
            {!isActive && !isPermanent
              ? "Reactivate Worker"
              : isPermanent
              ? "Permanently Delete"
              : "Deactivate"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Main Alert Notice */}
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <UserX className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-earth-900 text-sm">
              {isActive
                ? `Are you sure you want to deactivate ${labour.name}?`
                : `Manage status for ${labour.name}`}
            </p>
            <p className="text-earth-700 leading-relaxed">
              {isActive ? (
                <>
                  The worker will no longer appear as an active worker on daily muster rolls.
                  Historical details and agreements are safely preserved.
                </>
              ) : (
                <>
                  This worker is currently inactive. You can reactivate them to resume active duty
                  or choose permanent removal below.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Permanent Option Switch */}
        <div className="pt-2 border-t border-earth-100">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs text-earth-700">
            <input
              type="checkbox"
              checked={isPermanent}
              onChange={(e) => setIsPermanent(e.target.checked)}
              className="mt-0.5 rounded border-earth-300 text-red-600 focus:ring-red-500"
            />
            <div>
              <span className="font-semibold text-red-700 block">
                Permanently purge this record instead
              </span>
              <span className="text-[11px] text-earth-500 leading-normal block">
                Irreversibly deletes worker information from PostgreSQL. Recommended only if created in error.
              </span>
            </div>
          </label>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
