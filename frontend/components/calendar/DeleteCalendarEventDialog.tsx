import React, { useState } from "react";
import { Modal, Button } from "@/components/ui";
import { CalendarEvent } from "@/types";
import { AlertTriangle, Loader2 } from "lucide-react";

interface DeleteCalendarEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onConfirm: (eventId: string) => Promise<void>;
}

export function DeleteCalendarEventDialog({
  isOpen,
  onClose,
  event,
  onConfirm,
}: DeleteCalendarEventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!event) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      await onConfirm(event.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete calendar activity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Calendar Activity"
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900">
          <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold mb-1">Are you sure you want to delete this activity?</p>
            <p className="text-rose-700 text-xs leading-relaxed">
              This will remove <span className="font-bold">"{event.title}"</span> scheduled for{" "}
              <span className="font-mono">
                {new Date(event.start_datetime).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Note: This action only removes the scheduled calendar event. Your operational farm records (fields, crops, workers) will remain completely intact.
        </p>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-100 text-rose-800 text-xs">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
              "Yes, Delete Activity"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DeleteCalendarEventDialog;
