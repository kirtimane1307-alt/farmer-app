"use client";

import React, { useState } from "react";
import { SalaryRecord } from "@/types";
import { Modal, Button } from "@/components/ui";
import { salaryApi } from "@/lib/api/salary";
import { AlertTriangle } from "lucide-react";

interface DeleteSalaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedId: string) => void;
  salary: SalaryRecord | null;
}

export function DeleteSalaryDialog({
  isOpen,
  onClose,
  onSuccess,
  salary,
}: DeleteSalaryDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !salary) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await salaryApi.deleteSalary(salary.id);
      if (res.error) {
        setError(res.error || "Failed to delete salary record.");
      } else {
        onSuccess(salary.id);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting salary record.";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Salary Record" size="sm">
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-earth-900">
              Permanently delete this salary ledger?
            </p>
            <p className="text-xs text-earth-600">
              You are about to remove the salary record for{" "}
              <span className="font-semibold text-earth-900">{salary.labour_name || "this worker"}</span> covering{" "}
              <span className="font-semibold">{salary.period_start} to {salary.period_end}</span>.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200 mt-2">
              Note: Deletion is only allowed for unpaid salary records with zero payments disbursed.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-earth-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? "Deleting..." : "Delete Record"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
