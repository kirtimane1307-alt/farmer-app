import React, { useState } from "react";
import { Modal, Button } from "@/components/ui";
import { OtherIncome } from "@/types";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteIncomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  income: OtherIncome | null;
  onConfirm: (incomeId: string) => Promise<void>;
}

export function DeleteIncomeDialog({
  isOpen,
  onClose,
  income,
  onConfirm,
}: DeleteIncomeDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!income) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await onConfirm(income.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete income record.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Other Income Record"
      size="sm"
    >
      <div className="space-y-3">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
            {errorMessage}
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-earth-700 leading-relaxed">
              Are you sure you want to delete the income entry for{" "}
              <strong className="text-earth-900">{income.description}</strong> (₹
              {Number(income.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })})?
            </p>
            <p className="text-[11px] text-earth-500 mt-1">
              This record will be permanently removed from financial summaries and profit/loss calculations.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-earth-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting...</span>
              </span>
            ) : (
              <span>Confirm Delete</span>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteIncomeDialog;
