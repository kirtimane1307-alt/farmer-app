import React, { useState } from "react";
import { Expense } from "@/types";
import { Modal, Button } from "@/components/ui";
import { AlertTriangle, Trash2, AlertCircle } from "lucide-react";

interface DeleteExpenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onConfirm: (expenseId: string) => Promise<void>;
}

export function DeleteExpenseDialog({
  isOpen,
  onClose,
  expense,
  onConfirm,
}: DeleteExpenseDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!expense) return null;

  const hasPayments = (expense.amount_paid || 0) > 0;

  const handleConfirm = async () => {
    if (hasPayments) {
      setError(
        "Cannot delete an expense that already has recorded payment disbursements. Financial audit records must be preserved."
      );
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(expense.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete expense record.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Farm Expense"
      description="Permanent removal confirmation"
      size="md"
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
          <div className="p-2 bg-rose-100 rounded-lg text-rose-700 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="text-xs text-rose-900 space-y-1">
            <p className="font-semibold">
              Are you sure you want to delete this expense?
            </p>
            <p className="text-rose-700">
              <span className="font-bold">"{expense.title}"</span> &bull; ₹
              {expense.amount.toFixed(2)} ({expense.category_label})
            </p>
            {hasPayments ? (
              <p className="text-rose-800 font-semibold mt-2">
                ⚠️ This expense has recorded payment disbursements (₹
                {expense.amount_paid.toFixed(2)}). As a financial ledger
                record, it cannot be deleted while payments exist.
              </p>
            ) : (
              <p className="text-earth-500 mt-1">
                This action cannot be undone. This expense will be permanently
                removed from financial calculations.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={isDeleting || hasPayments}
          >
            {isDeleting ? "Deleting..." : "Delete Expense"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
