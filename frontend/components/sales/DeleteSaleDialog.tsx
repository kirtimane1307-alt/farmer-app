import React, { useState } from "react";
import { Modal, Button } from "@/components/ui";
import { Sale } from "@/types";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";

interface DeleteSaleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onConfirm: (saleId: string) => Promise<void>;
}

export function DeleteSaleDialog({
  isOpen,
  onClose,
  sale,
  onConfirm,
}: DeleteSaleDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!sale) return null;

  const hasPayments = (sale.amount_paid || 0) > 0;

  const handleConfirm = async () => {
    if (hasPayments) {
      setErrorMessage(
        `Cannot delete sale with recorded customer payments (₹${sale.amount_paid.toFixed(
          2
        )}). Financial audit rules require all payments to be deleted first.`
      );
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMessage(null);
      await onConfirm(sale.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete sale invoice.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Produce Sale Invoice"
      size="sm"
    >
      <div className="space-y-3">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-earth-700 leading-relaxed">
              Are you sure you want to permanently delete sale invoice{" "}
              <strong className="text-earth-900 font-mono">{sale.sale_number}</strong>{" "}
              for <strong className="text-earth-900">{sale.buyer_name}</strong>?
            </p>
            {hasPayments ? (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px]">
                <strong>Audit Warning:</strong> This sale has recorded payments of ₹
                {sale.amount_paid.toFixed(2)}. Financial integrity rules prevent deletion
                while payments remain on record.
              </div>
            ) : (
              <p className="text-[11px] text-earth-500 mt-1">
                This action cannot be undone. Associated records will be safely cleaned up.
              </p>
            )}
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
            disabled={isDeleting || hasPayments}
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

export default DeleteSaleDialog;
