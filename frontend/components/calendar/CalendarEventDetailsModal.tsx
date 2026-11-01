import React, { useState } from "react";
import { Modal, Button } from "@/components/ui";
import { CalendarEvent, CalendarEventStatus } from "@/types";
import { ActivityTypeBadge } from "./ActivityTypeBadge";
import { EventStatusBadge } from "./EventStatusBadge";
import {
  Calendar as CalendarIcon,
  Clock,
  Building,
  Layers,
  Wheat,
  User,
  AlertTriangle,
  FileText,
  Edit2,
  Trash2,
  CheckCircle2,
  PlayCircle,
  XCircle,
  RotateCcw,
  Loader2,
  CalendarCheck,
} from "lucide-react";

interface CalendarEventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (event: CalendarEvent) => void;
  onStatusChange: (eventId: string, status: CalendarEventStatus) => Promise<void>;
}

export function CalendarEventDetailsModal({
  isOpen,
  onClose,
  event,
  onEdit,
  onDelete,
  onStatusChange,
}: CalendarEventDetailsModalProps) {
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  if (!event) return null;

  const handleStatusUpdate = async (newStatus: CalendarEventStatus) => {
    try {
      setUpdatingStatus(true);
      await onStatusChange(event.id, newStatus);
    } catch {
      // Handled by parent notification
    } finally {
      setUpdatingStatus(false);
    }
  };

  const startDate = new Date(event.start_datetime);
  const endDate = event.end_datetime ? new Date(event.end_datetime) : null;
  const completionDate = event.actual_completion_datetime
    ? new Date(event.actual_completion_datetime)
    : null;

  const formatDate = (date: Date) =>
    date.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Farm Activity Details"
      size="lg"
    >
      <div className="space-y-6 pt-1">
        {/* Top Badges & Title */}
        <div className="space-y-3 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            <ActivityTypeBadge activityType={event.activity_type} />
            <EventStatusBadge status={event.status} />
            {event.priority === "high" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="h-3 w-3" />
                High Priority
              </span>
            )}
            {event.priority === "medium" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Medium Priority
              </span>
            )}
            {event.priority === "low" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                Low Priority
              </span>
            )}
          </div>

          <h3 className={`text-xl font-bold text-slate-900 ${event.status === "completed" ? "line-through text-slate-600" : ""}`}>
            {event.title}
          </h3>

          {event.description && (
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          )}
        </div>

        {/* Schedule & Timing Grid */}
        <div className="bg-slate-50/70 rounded-xl p-4 border border-slate-200/80 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-emerald-600" />
            Schedule & Time Tracking
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-slate-500 font-medium block">Start Time</span>
              <span className="font-semibold text-slate-800">
                {formatDate(startDate)}
                {!event.all_day && ` at ${formatTime(startDate)}`}
              </span>
              {event.all_day && (
                <span className="ml-2 inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                  All-Day
                </span>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-500 font-medium block">End Time</span>
              <span className="font-semibold text-slate-800">
                {endDate ? (
                  <>
                    {formatDate(endDate)}
                    {!event.all_day && ` at ${formatTime(endDate)}`}
                  </>
                ) : (
                  <span className="text-slate-400 italic">Same as start</span>
                )}
              </span>
            </div>

            {completionDate && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-200/60">
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  Actual Completion Timestamp
                </span>
                <span className="font-bold text-emerald-900">
                  {formatDate(completionDate)} at {formatTime(completionDate)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Farm & Resource Linking */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Building className="h-4 w-4 text-emerald-600" />
            Agricultural Scoping & Workforce
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <Building className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Farm Location</div>
                <div className="font-semibold text-slate-800">{event.farm_name || "Assigned Farm"}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <Layers className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Cultivated Field</div>
                <div className="font-semibold text-slate-800">
                  {event.field_name || <span className="text-slate-400 font-normal">Entire Farm</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <Wheat className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Target Crop</div>
                <div className="font-semibold text-slate-800">
                  {event.crop_name || <span className="text-slate-400 font-normal">General / Non-crop</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-white">
              <User className="h-5 w-5 text-slate-400 shrink-0" />
              <div>
                <div className="text-xs text-slate-500">Assigned Labour</div>
                <div className="font-semibold text-slate-800">
                  {event.assigned_labour_name || (
                    <span className="text-slate-400 font-normal">Unassigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Notes */}
        {event.notes && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-emerald-600" />
              Operational Notes
            </h4>
            <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700 leading-relaxed border border-slate-200">
              {event.notes}
            </div>
          </div>
        )}

        {/* Status Workflow Controls */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Update Activity Status
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {event.status !== "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate("completed")}
                disabled={updatingStatus}
                className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              >
                {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                Mark Completed
              </Button>
            )}

            {event.status !== "in_progress" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate("in_progress")}
                disabled={updatingStatus}
                className="gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
              >
                {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5 text-blue-600" />}
                Set In Progress
              </Button>
            )}

            {event.status !== "planned" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate("planned")}
                disabled={updatingStatus}
                className="gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-50"
              >
                {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 text-slate-500" />}
                Reset to Planned
              </Button>
            )}

            {event.status !== "cancelled" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={updatingStatus}
                className="gap-1.5 text-rose-700 border-rose-300 hover:bg-rose-50"
              >
                {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                Cancel Event
              </Button>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              onDelete(event);
            }}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Delete Event
          </Button>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(event);
              }}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Edit2 className="h-4 w-4" />
              Edit Activity
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default CalendarEventDetailsModal;
