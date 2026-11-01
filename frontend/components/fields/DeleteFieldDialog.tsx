"use client";

import React, { useState } from "react";
import { Field } from "@/types";
import { Modal, Button } from "@/components/ui";
import { fieldsApi } from "@/lib/api/fields";
import { AlertTriangle, AlertCircle } from "lucide-react";

interface DeleteFieldDialogProps {
  isOpen: boolean;
  field: Field | null;
  onClose: () => void;
  onSuccess: (deletedFieldId: string) => void;
}

export function DeleteFieldDialog({
  isOpen,
  field,
  onClose,
  onSuccess,
}: DeleteFieldDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!field) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fieldsApi.deleteField(field.id);
      if (res.error) {
        setError(res.error);
      } else {
        onSuccess(field.id);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete field.";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isDeleting && onClose()}
      title="Delete Field Plot"
      size="sm"
      footer={
        <>
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
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Permanently Delete"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-earth-900 text-sm">
              Confirm deletion of &ldquo;{field.name}&rdquo;
            </p>
            <p className="text-earth-600">
              Are you sure you want to permanently delete this field plot ({field.area} {field.area_unit})?
            </p>
          </div>
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
