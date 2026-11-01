"use client";

import React, { useState } from "react";
import { Attendance } from "@/types";
import { Modal, Button } from "@/components/ui";
import { attendanceApi } from "@/lib/api/attendance";
import { AlertTriangle } from "lucide-react";

interface DeleteAttendanceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletedId: string) => void;
  attendance: Attendance | null;
}

export function DeleteAttendanceDialog({
  isOpen,
  onClose,
  onSuccess,
  attendance,
}: DeleteAttendanceDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !attendance) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await attendanceApi.deleteAttendance(attendance.id);
      if (res.error) {
        setError(res.error || "Failed to delete attendance record.");
      } else {
        onSuccess(attendance.id);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting record.";
      setError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Attendance Record" size="sm">
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
              Are you sure you want to delete this log?
            </p>
            <p className="text-xs text-earth-600 leading-relaxed">
              This will remove attendance for{" "}
              <strong className="text-earth-900">{attendance.labour_name || "this worker"}</strong> on{" "}
              <strong className="text-earth-900">{attendance.attendance_date}</strong> (
              {attendance.working_hours_formatted} recorded).
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-earth-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Record
          </Button>
        </div>
      </div>
    </Modal>
  );
}
