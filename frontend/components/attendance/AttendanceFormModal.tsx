"use client";

import React, { useState, useEffect } from "react";
import {
  Attendance,
  AttendanceCreatePayload,
  AttendanceUpdatePayload,
  AttendanceStatus,
  Labour,
} from "@/types";
import { Modal, Button, Input, Select } from "@/components/ui";
import { attendanceApi } from "@/lib/api/attendance";
import {
  Clock,
  Calendar,
  User,
  Timer,
  FileText,
  AlertCircle,
  LogIn,
  LogOut,
  Info,
} from "lucide-react";

interface AttendanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedAttendance: Attendance) => void;
  attendanceToEdit?: Attendance | null;
  workers: Labour[];
  defaultDate?: string;
  defaultLabourId?: string;
}

export function AttendanceFormModal({
  isOpen,
  onClose,
  onSuccess,
  attendanceToEdit,
  workers,
  defaultDate,
  defaultLabourId,
}: AttendanceFormModalProps) {
  const isEditing = Boolean(attendanceToEdit);

  // Form states
  const [labourId, setLabourId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [status, setStatus] = useState<AttendanceStatus>("present");
  const [checkIn, setCheckIn] = useState("09:00");
  const [checkOut, setCheckOut] = useState("17:00");
  const [overtimeMinutes, setOvertimeMinutes] = useState("0");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (attendanceToEdit) {
      setLabourId(attendanceToEdit.labour_id);
      setAttendanceDate(attendanceToEdit.attendance_date);
      setStatus(attendanceToEdit.status);
      setCheckIn(attendanceToEdit.check_in ? attendanceToEdit.check_in.slice(0, 5) : "");
      setCheckOut(attendanceToEdit.check_out ? attendanceToEdit.check_out.slice(0, 5) : "");
      setOvertimeMinutes(String(attendanceToEdit.overtime_minutes || 0));
      setNotes(attendanceToEdit.notes || "");
    } else {
      const initialLabourId = defaultLabourId || (workers.length > 0 ? workers[0].id : "");
      setLabourId(initialLabourId);
      setAttendanceDate(defaultDate || new Date().toISOString().split("T")[0]);
      setStatus("present");
      setCheckIn("09:00");
      setCheckOut("17:00");
      setOvertimeMinutes("0");
      setNotes("");
    }
    setFormError(null);
  }, [attendanceToEdit, isOpen, workers, defaultDate, defaultLabourId]);

  if (!isOpen) return null;

  // Live working hours preview calculation
  const calculatePreviewHours = (): string => {
    if (status === "absent" || status === "leave") {
      return "0h (0 mins)";
    }
    if (checkIn && checkOut) {
      const [hIn, mIn] = checkIn.split(":").map(Number);
      const [hOut, mOut] = checkOut.split(":").map(Number);
      if (!isNaN(hIn) && !isNaN(mIn) && !isNaN(hOut) && !isNaN(mOut)) {
        let mins = 0;
        const totalIn = hIn * 60 + mIn;
        const totalOut = hOut * 60 + mOut;
        if (totalOut >= totalIn) {
          mins = totalOut - totalIn;
        } else {
          // Overnight shift
          mins = 1440 - totalIn + totalOut;
        }
        const hours = Math.floor(mins / 60);
        const remMins = mins % 60;
        return remMins > 0 ? `${hours}h ${remMins}m (${mins} mins)` : `${hours}h (${mins} mins)`;
      }
    }
    if (status === "present") return "Standard 8h (480 mins)";
    if (status === "half_day") return "Standard 4h (240 mins)";
    return "0h";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!labourId) {
      setFormError("Please select a worker.");
      return;
    }
    if (!attendanceDate) {
      setFormError("Attendance date is required.");
      return;
    }

    const otNum = parseInt(overtimeMinutes, 10) || 0;
    if (otNum < 0) {
      setFormError("Overtime minutes cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && attendanceToEdit) {
        const payload: AttendanceUpdatePayload = {
          attendance_date: attendanceDate,
          status,
          check_in: status !== "absent" && status !== "leave" && checkIn ? checkIn : null,
          check_out: status !== "absent" && status !== "leave" && checkOut ? checkOut : null,
          overtime_minutes: otNum,
          notes: notes.trim() || null,
        };

        const res = await attendanceApi.updateAttendance(attendanceToEdit.id, payload);
        if (res.error) {
          setFormError(res.error || "Failed to update attendance.");
        } else if (res.data) {
          onSuccess(res.data);
          onClose();
        }
      } else {
        const payload: AttendanceCreatePayload = {
          labour_id: labourId,
          attendance_date: attendanceDate,
          status,
          check_in: status !== "absent" && status !== "leave" && checkIn ? checkIn : null,
          check_out: status !== "absent" && status !== "leave" && checkOut ? checkOut : null,
          overtime_minutes: otNum,
          notes: notes.trim() || null,
        };

        const res = await attendanceApi.createAttendance(payload);
        if (res.error) {
          setFormError(res.error || "Failed to record attendance.");
        } else if (res.data) {
          onSuccess(res.data);
          onClose();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving attendance.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const workerOptions = workers.map((w) => ({
    label: `${w.name} (${w.work_type}) - ${w.farm_name || "Estate"}`,
    value: w.id,
  }));

  const showClockFields = status === "present" || status === "half_day";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Attendance Record" : "Record Worker Attendance"}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Worker Selector */}
        {isEditing ? (
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">Worker</label>
            <div className="p-2.5 bg-earth-50 rounded-xl border border-earth-200 text-xs font-bold text-earth-900 flex items-center gap-2">
              <User className="h-4 w-4 text-farm-600" />
              <span>{attendanceToEdit?.labour_name || "Assigned Worker"}</span>
            </div>
          </div>
        ) : (
          <Select
            label="Agricultural Worker *"
            value={labourId}
            onChange={(e) => setLabourId(e.target.value)}
            options={workerOptions}
            required
          />
        )}

        {/* Attendance Date */}
        <Input
          type="date"
          label="Attendance Date *"
          value={attendanceDate}
          onChange={(e) => setAttendanceDate(e.target.value)}
          required
        />

        {/* Status Radio / Selector */}
        <div>
          <label className="block text-xs font-semibold text-earth-700 mb-1.5">
            Attendance Status *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "present", label: "Present", color: "hover:border-emerald-500" },
              { id: "absent", label: "Absent", color: "hover:border-red-500" },
              { id: "half_day", label: "Half Day", color: "hover:border-amber-500" },
              { id: "leave", label: "On Leave", color: "hover:border-indigo-500" },
            ].map((st) => {
              const isSelected = status === st.id;
              return (
                <button
                  type="button"
                  key={st.id}
                  onClick={() => setStatus(st.id as AttendanceStatus)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                    isSelected
                      ? "bg-farm-600 text-white border-farm-600 shadow-2xs"
                      : `bg-white text-earth-700 border-earth-200 ${st.color} hover:bg-earth-50`
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Clock In / Out Fields */}
        {showClockFields ? (
          <div className="p-3.5 bg-earth-50/70 border border-earth-200 rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1 flex items-center gap-1">
                  <LogIn className="h-3.5 w-3.5 text-emerald-600" />
                  Check-In Time
                </label>
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-farm-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1 flex items-center gap-1">
                  <LogOut className="h-3.5 w-3.5 text-amber-600" />
                  Check-Out Time
                </label>
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-farm-600"
                />
              </div>
            </div>

            {/* Live Duration Calculation Indicator */}
            <div className="flex items-center justify-between text-xs pt-1 px-1 text-earth-600">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-farm-600" />
                Working Duration Preview:
              </span>
              <span className="font-bold text-earth-900 bg-white px-2 py-0.5 rounded border border-earth-200">
                {calculatePreviewHours()}
              </span>
            </div>

            {/* Overtime Duration */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1 flex items-center gap-1">
                <Timer className="h-3.5 w-3.5 text-amber-600" />
                Approved Overtime (Minutes)
              </label>
              <input
                type="number"
                min="0"
                step="15"
                value={overtimeMinutes}
                onChange={(e) => setOvertimeMinutes(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-xs rounded-lg border border-earth-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-farm-600"
              />
              <p className="text-[10px] text-earth-400 mt-0.5">
                e.g. 30 for 30 mins, 60 for 1 hour. Cannot exceed total working time.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              For {status === "absent" ? "Absent" : "On Leave"} status, working hours and overtime
              are automatically registered as 0.
            </span>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-earth-700 mb-1 flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-earth-500" />
            Administrative Remarks & Tasks
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Morning tractor tilling in plot 2, afternoon valve repair"
            className="w-full px-3 py-2 text-xs rounded-lg border border-earth-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-farm-600"
          />
        </div>

        {/* Dialog Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-earth-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
            {isEditing ? "Save Changes" : "Record Attendance"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
