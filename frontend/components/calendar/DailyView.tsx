import React from "react";
import { CalendarEvent, CalendarEventStatusPayload } from "@/types";
import { ActivityTypeBadge } from "./ActivityTypeBadge";
import { EventStatusBadge } from "./EventStatusBadge";
import {
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  PlayCircle,
  Building,
  Layers,
  Wheat,
  User,
  Plus,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui";

interface DailyViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onAddEventForDate: (date: Date) => void;
  onQuickStatusChange?: (eventId: string, status: string) => Promise<void>;
  isLoading?: boolean;
}

export function DailyView({
  selectedDate,
  events,
  onSelectEvent,
  onAddEventForDate,
  onQuickStatusChange,
  isLoading = false,
}: DailyViewProps) {
  const selectedStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  // Filter events overlapping selectedDate
  const dayEvents = events.filter((ev) => {
    const startStr = ev.start_datetime.split("T")[0];
    const endStr = ev.end_datetime ? ev.end_datetime.split("T")[0] : startStr;
    return selectedStr >= startStr && selectedStr <= endStr;
  });

  // Separate all-day vs timed
  const allDayEvents = dayEvents.filter((e) => e.all_day);
  const timedEvents = dayEvents.filter((e) => !e.all_day).sort((a, b) => {
    return new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime();
  });

  const formattedDate = selectedDate.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isToday =
    new Date().toISOString().split("T")[0] === selectedStr;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-6">
      {/* Date Agenda Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">{formattedDate}</h3>
            {isToday && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Today
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {dayEvents.length} {dayEvents.length === 1 ? "activity" : "activities"} scheduled for this date
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => onAddEventForDate(selectedDate)}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Activity for this Day
        </Button>
      </div>

      {/* Empty State */}
      {dayEvents.length === 0 ? (
        <div className="py-16 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-slate-300" />
          <h4 className="mt-3 text-base font-semibold text-slate-800">
            No Farm Activities Scheduled
          </h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Plan field operations, irrigation schedules, or worker assignments for {formattedDate}.
          </p>
          <div className="mt-5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddEventForDate(selectedDate)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Schedule Activity Now
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* All-Day Events */}
          {allDayEvents.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-slate-400" />
                All-Day Activities ({allDayEvents.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allDayEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onSelect={() => onSelectEvent(ev)}
                    onQuickStatusChange={onQuickStatusChange}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Timed Events Timeline */}
          {timedEvents.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                Timed Schedule ({timedEvents.length})
              </h4>
              <div className="space-y-3">
                {timedEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onSelect={() => onSelectEvent(ev)}
                    onQuickStatusChange={onQuickStatusChange}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({
  event,
  onSelect,
  onQuickStatusChange,
}: {
  event: CalendarEvent;
  onSelect: () => void;
  onQuickStatusChange?: (eventId: string, status: string) => Promise<void>;
}) {
  const isCompleted = event.status === "completed";
  const isInProgress = event.status === "in_progress";

  const startTimeStr = new Date(event.start_datetime).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endTimeStr = event.end_datetime
    ? new Date(event.end_datetime).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      onClick={onSelect}
      className={`rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${
        isCompleted
          ? "bg-slate-50/60 border-slate-200 opacity-80"
          : "bg-white border-slate-200 hover:border-emerald-300"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Title, Activity, and Time */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ActivityTypeBadge activityType={event.activity_type} />
            <EventStatusBadge status={event.status} />
            {event.priority === "high" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle className="h-3 w-3" />
                High Priority
              </span>
            )}
          </div>

          <h4 className={`text-base font-bold text-slate-900 ${isCompleted ? "line-through text-slate-500" : ""}`}>
            {event.title}
          </h4>

          {event.description && (
            <p className="text-xs text-slate-600 line-clamp-2">{event.description}</p>
          )}

          {/* Time & Scope Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              {event.all_day ? "Full Day Activity" : `${startTimeStr}${endTimeStr ? ` – ${endTimeStr}` : ""}`}
            </span>

            <span className="flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-slate-400" />
              {event.farm_name || "Assigned Farm"}
            </span>

            {event.field_name && (
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                {event.field_name}
              </span>
            )}

            {event.crop_name && (
              <span className="flex items-center gap-1">
                <Wheat className="h-3.5 w-3.5 text-slate-400" />
                {event.crop_name}
              </span>
            )}

            {event.assigned_labour_name && (
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <User className="h-3.5 w-3.5 text-slate-400" />
                {event.assigned_labour_name}
              </span>
            )}
          </div>
        </div>

        {/* Quick Status Action Button */}
        {onQuickStatusChange && (
          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
            {!isCompleted ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickStatusChange(event.id, "completed");
                }}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
                title="Mark activity completed"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark Complete
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickStatusChange(event.id, "in_progress");
                }}
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                title="Reopen activity"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Reopen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyView;
