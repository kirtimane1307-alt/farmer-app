"use client";

import React, { useState, useEffect } from "react";
import { Labour, AttendanceStatus, BulkAttendancePayload } from "@/types";
import { Modal, Button, Input } from "@/components/ui";
import { attendanceApi } from "@/lib/api/attendance";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  AlertCircle,
  Users,
  Check,
  Tractor,
} from "lucide-react";

interface DailyMusterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workers: Labour[];
  defaultDate: string;
  farmId?: string;
}

interface WorkerRowState {
  labour_id: string;
  name: string;
  work_type: string;
  farm_name?: string;
  status: AttendanceStatus;
  check_in: string;
  check_out: string;
  overtime_minutes: number;
}

export function DailyMusterModal({
  isOpen,
  onClose,
  onSuccess,
  workers,
  defaultDate,
  farmId,
}: DailyMusterModalProps) {
  const [targetDate, setTargetDate] = useState(defaultDate);
  const [rows, setRows] = useState<WorkerRowState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Initialize roster state from workers
  useEffect(() => {
    setTargetDate(defaultDate);
    const initialRows: WorkerRowState[] = workers.map((w) => ({
      labour_id: w.id,
      name: w.name,
      work_type: w.work_type,
      farm_name: w.farm_name,
      status: "present",
      check_in: "09:00",
      check_out: "17:00",
      overtime_minutes: 0,
    }));
    setRows(initialRows);
    setErrorMessage(null);
    setSuccessInfo(null);
  }, [workers, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleStatusChange = (index: number, newStatus: AttendanceStatus) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        status: newStatus,
        check_in: newStatus === "present" || newStatus === "half_day" ? updated[index].check_in || "09:00" : "",
        check_out: newStatus === "present" ? updated[index].check_out || "17:00" : newStatus === "half_day" ? "13:00" : "",
      };
      return updated;
    });
  };

  const handleTimeChange = (index: number, field: "check_in" | "check_out", value: string) => {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleMarkAll = (newStatus: AttendanceStatus) => {
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        status: newStatus,
        check_in: newStatus === "present" || newStatus === "half_day" ? "09:00" : "",
        check_out: newStatus === "present" ? "17:00" : newStatus === "half_day" ? "13:00" : "",
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    if (rows.length === 0) {
      setErrorMessage("No workers available to log attendance.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: BulkAttendancePayload = {
        attendance_date: targetDate,
        farm_id: farmId || undefined,
        records: rows.map((r) => ({
          labour_id: r.labour_id,
          status: r.status,
          check_in: r.status !== "absent" && r.status !== "leave" ? r.check_in || null : null,
          check_out: r.status !== "absent" && r.status !== "leave" ? r.check_out || null : null,
          overtime_minutes: r.overtime_minutes || 0,
        })),
      };

      const res = await attendanceApi.submitBulkAttendance(payload);
      if (res.error) {
        setErrorMessage(res.error || "Failed to submit attendance sheet.");
      } else if (res.data) {
        if (res.data.failed > 0 && res.data.errors.length > 0) {
          setErrorMessage(`Partial error: ${res.data.errors.join("; ")}`);
        } else {
          setSuccessInfo(
            `Successfully processed attendance for ${res.data.total_submitted} workers (${res.data.created} created, ${res.data.updated} updated).`
          );
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 800);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving attendance sheet.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daily Muster Roll — Batch Attendance"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successInfo && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successInfo}</span>
          </div>
        )}

        {/* Top Header Bar: Date and Bulk Shortcuts */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-earth-50 rounded-xl border border-earth-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-earth-700">Muster Date:</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-white px-2.5 py-1 rounded-lg border border-earth-200 text-xs font-semibold text-earth-900 focus:outline-hidden"
              required
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-[11px] font-medium text-earth-500 mr-1">Quick Select:</span>
            <button
              type="button"
              onClick={() => handleMarkAll("present")}
              className="text-[11px] font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors"
            >
              All Present
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll("absent")}
              className="text-[11px] font-semibold px-2 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
            >
              All Absent
            </button>
          </div>
        </div>

        {/* Worker Roster Table */}
        <div className="max-h-[50vh] overflow-y-auto border border-earth-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-earth-100/70 border-b border-earth-200 text-earth-700 font-semibold sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Worker</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Shift Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-earth-100">
              {rows.map((row, idx) => {
                const showTimes = row.status === "present" || row.status === "half_day";
                return (
                  <tr key={row.labour_id} className="hover:bg-earth-50/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-earth-900">{row.name}</div>
                      <div className="text-[10px] text-earth-500 flex items-center gap-1">
                        <span>{row.work_type}</span>
                        {row.farm_name && (
                          <>
                            <span>&bull;</span>
                            <span>{row.farm_name}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Status Pill Buttons */}
                    <td className="py-2.5 px-3">
                      <div className="inline-flex rounded-lg border border-earth-200 bg-white p-0.5 text-[11px]">
                        {[
                          { id: "present", label: "P", full: "Present", color: "bg-emerald-600 text-white" },
                          { id: "absent", label: "A", full: "Absent", color: "bg-red-600 text-white" },
                          { id: "half_day", label: "H", full: "Half Day", color: "bg-amber-600 text-white" },
                          { id: "leave", label: "L", full: "Leave", color: "bg-indigo-600 text-white" },
                        ].map((btn) => {
                          const isActive = row.status === btn.id;
                          return (
                            <button
                              type="button"
                              key={btn.id}
                              onClick={() => handleStatusChange(idx, btn.id as AttendanceStatus)}
                              title={btn.full}
                              className={`px-2 py-0.5 rounded font-bold transition-all ${
                                isActive
                                  ? btn.color
                                  : "text-earth-600 hover:bg-earth-100"
                              }`}
                            >
                              {btn.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* Check In / Out Inputs */}
                    <td className="py-2.5 px-3">
                      {showTimes ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          <input
                            type="time"
                            value={row.check_in}
                            onChange={(e) => handleTimeChange(idx, "check_in", e.target.value)}
                            className="px-1.5 py-0.5 border border-earth-200 rounded text-xs w-20 bg-white"
                          />
                          <span className="text-earth-400">&rarr;</span>
                          <input
                            type="time"
                            value={row.check_out}
                            onChange={(e) => handleTimeChange(idx, "check_out", e.target.value)}
                            className="px-1.5 py-0.5 border border-earth-200 rounded text-xs w-20 bg-white"
                          />
                        </div>
                      ) : (
                        <span className="text-earth-400 italic text-[11px]">0h (Non-working)</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-earth-100">
          <span className="text-xs text-earth-500 font-medium">
            {rows.length} workers in this sheet
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              <CalendarCheck className="h-3.5 w-3.5 mr-1.5" />
              Save Attendance Sheet
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
