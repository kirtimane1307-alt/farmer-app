"use client";

import React from "react";
import Link from "next/link";
import { Attendance } from "@/types";
import { AttendanceStatusBadge } from "./AttendanceStatusBadge";
import { Button } from "@/components/ui";
import {
  Clock,
  Edit2,
  Trash2,
  Tractor,
  FileText,
  Timer,
  LogIn,
  LogOut,
  CalendarCheck,
} from "lucide-react";

interface AttendanceTableProps {
  attendances: Attendance[];
  isLoading?: boolean;
  onEdit: (attendance: Attendance) => void;
  onDelete: (attendance: Attendance) => void;
  onQuickClockOut?: (attendance: Attendance) => void;
}

export function formatTimeDisplay(timeStr?: string | null): string {
  if (!timeStr) return "--";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const minute = parts[1];
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
  return `${hourStr}:${minute} ${ampm}`;
}

export function AttendanceTable({
  attendances,
  isLoading = false,
  onEdit,
  onDelete,
  onQuickClockOut,
}: AttendanceTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-earth-200 overflow-hidden shadow-2xs">
        <div className="p-8 text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-farm-600 mx-auto" />
          <p className="text-xs font-medium text-earth-500">Loading attendance records...</p>
        </div>
      </div>
    );
  }

  if (attendances.length === 0) {
    return null; // EmptyState will be rendered in parent
  }

  return (
    <div className="bg-white rounded-2xl border border-earth-200 overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-earth-50/80 border-b border-earth-200 text-earth-600 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3.5 px-4">Worker & Farm</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Check-In</th>
              <th className="py-3.5 px-4">Check-Out</th>
              <th className="py-3.5 px-4">Duration</th>
              <th className="py-3.5 px-4">Overtime</th>
              <th className="py-3.5 px-4 hidden md:table-cell">Notes</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-earth-100 text-earth-800">
            {attendances.map((att) => {
              const workerInitial = (att.labour_name || "W").charAt(0).toUpperCase();
              const needsClockOut =
                att.status === "present" &&
                Boolean(att.check_in) &&
                !att.check_out;

              return (
                <tr
                  key={att.id}
                  className="hover:bg-earth-50/60 transition-colors group"
                >
                  {/* Worker & Farm */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-farm-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {workerInitial}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/labour/${att.labour_id}`}
                          className="font-bold text-earth-900 hover:text-farm-700 transition-colors truncate block"
                        >
                          {att.labour_name || "Worker"}
                        </Link>
                        <div className="text-[11px] text-earth-500 flex items-center gap-1.5 truncate">
                          <span>{att.work_type || "General Labour"}</span>
                          {att.farm_name && (
                            <>
                              <span>&bull;</span>
                              <span className="flex items-center gap-0.5 text-earth-600 font-medium">
                                <Tractor className="h-3 w-3 text-earth-400" />
                                {att.farm_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4">
                    <AttendanceStatusBadge status={att.status} size="sm" />
                  </td>

                  {/* Check-In */}
                  <td className="py-3 px-4 font-medium">
                    {att.check_in ? (
                      <span className="flex items-center gap-1 text-earth-800">
                        <LogIn className="h-3 w-3 text-emerald-600" />
                        {formatTimeDisplay(att.check_in)}
                      </span>
                    ) : (
                      <span className="text-earth-400 italic">--</span>
                    )}
                  </td>

                  {/* Check-Out */}
                  <td className="py-3 px-4 font-medium">
                    {att.check_out ? (
                      <span className="flex items-center gap-1 text-earth-800">
                        <LogOut className="h-3 w-3 text-amber-600" />
                        {formatTimeDisplay(att.check_out)}
                      </span>
                    ) : needsClockOut ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onQuickClockOut?.(att)}
                        className="h-6 text-[11px] px-2 text-farm-700 hover:bg-farm-50 border-farm-200"
                        title="Clock Out Now"
                      >
                        <LogOut className="h-2.5 w-2.5 mr-1 text-farm-600" />
                        Clock Out
                      </Button>
                    ) : (
                      <span className="text-earth-400 italic">--</span>
                    )}
                  </td>

                  {/* Working Duration */}
                  <td className="py-3 px-4">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-earth-100/80 font-bold text-earth-900 text-xs">
                      <Clock className="h-3 w-3 text-farm-600" />
                      <span>{att.working_hours_formatted || "0h"}</span>
                    </div>
                  </td>

                  {/* Overtime */}
                  <td className="py-3 px-4">
                    {att.overtime_minutes > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-xs">
                        <Timer className="h-3 w-3 text-amber-600" />
                        +{att.overtime_hours_formatted}
                      </span>
                    ) : (
                      <span className="text-earth-400">--</span>
                    )}
                  </td>

                  {/* Notes */}
                  <td className="py-3 px-4 hidden md:table-cell max-w-xs truncate text-earth-600">
                    {att.notes ? (
                      <span title={att.notes} className="flex items-center gap-1">
                        <FileText className="h-3 w-3 text-earth-400 shrink-0" />
                        <span className="truncate">{att.notes}</span>
                      </span>
                    ) : (
                      <span className="text-earth-300 italic">No notes</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(att)}
                        className="h-7 w-7 p-0 text-earth-600 hover:text-earth-900 border-earth-200"
                        title="Edit Attendance"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(att)}
                        className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                        title="Delete Attendance Log"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
