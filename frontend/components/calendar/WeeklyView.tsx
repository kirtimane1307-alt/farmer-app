import React from "react";
import { CalendarEvent } from "@/types";
import { ActivityTypeBadge, ACTIVITY_TYPE_CONFIG } from "./ActivityTypeBadge";
import { EventStatusBadge } from "./EventStatusBadge";
import { Clock, Plus, Calendar as CalendarIcon, User, Building, MapPin } from "lucide-react";

interface WeeklyViewProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onAddEventForDate?: (date: Date) => void;
}

export function WeeklyView({
  currentDate,
  selectedDate,
  onSelectDate,
  events,
  onSelectEvent,
  onAddEventForDate,
}: WeeklyViewProps) {
  // Compute start of week (Sunday)
  const dayOfWeek = currentDate.getDay();
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - dayOfWeek);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  const weekDays: Array<{
    date: Date;
    dateStr: string;
    dayName: string;
    dayNumber: number;
    isToday: boolean;
    isSelected: boolean;
  }> = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    weekDays.push({
      date: d,
      dateStr,
      dayName: d.toLocaleDateString(undefined, { weekday: "short" }),
      dayNumber: d.getDate(),
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedStr,
    });
  }

  // Map events by date
  const eventsByDate = new Map<string, { allDay: CalendarEvent[]; timed: CalendarEvent[] }>();
  for (const day of weekDays) {
    eventsByDate.set(day.dateStr, { allDay: [], timed: [] });
  }

  for (const ev of events) {
    const startStr = ev.start_datetime.split("T")[0];
    const endStr = ev.end_datetime ? ev.end_datetime.split("T")[0] : startStr;

    for (const day of weekDays) {
      if (day.dateStr >= startStr && day.dateStr <= endStr) {
        const bucket = eventsByDate.get(day.dateStr);
        if (bucket) {
          if (ev.all_day) {
            bucket.allDay.push(ev);
          } else {
            bucket.timed.push(ev);
          }
        }
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* 7-column grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        {weekDays.map((day) => {
          const { allDay, timed } = eventsByDate.get(day.dateStr) || { allDay: [], timed: [] };
          const totalDayEvents = allDay.length + timed.length;

          return (
            <div
              key={day.dateStr}
              onClick={() => onSelectDate(day.date)}
              className={`flex flex-col min-h-[350px] p-3 transition-colors ${
                day.isSelected ? "bg-emerald-50/20 ring-1 ring-emerald-500 ring-inset" : "hover:bg-slate-50/50"
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {day.dayName}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`inline-flex items-center justify-center text-sm font-extrabold h-7 w-7 rounded-full ${
                        day.isToday
                          ? "bg-emerald-600 text-white shadow-xs"
                          : day.isSelected
                          ? "bg-emerald-100 text-emerald-800"
                          : "text-slate-800"
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    {day.isToday && (
                      <span className="text-[10px] font-semibold text-emerald-600">Today</span>
                    )}
                  </div>
                </div>

                {onAddEventForDate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddEventForDate(day.date);
                    }}
                    className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title={`Add activity for ${day.dayName}, ${day.dayNumber}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* All-Day Events Section */}
              {allDay.length > 0 && (
                <div className="space-y-1 mb-2 pb-2 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    All Day
                  </span>
                  {allDay.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50/80 text-emerald-900 text-xs cursor-pointer hover:bg-emerald-100/80 transition-colors"
                    >
                      <div className="font-semibold truncate">{ev.title}</div>
                      <div className="text-[10px] text-emerald-700 capitalize">
                        {ev.activity_type.replace(/_/g, " ")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Timed Events Section */}
              <div className="space-y-2 flex-1">
                {timed.length === 0 && allDay.length === 0 ? (
                  <div className="py-8 text-center text-slate-300 text-xs">
                    No activities
                  </div>
                ) : (
                  timed.map((ev) => {
                    const timeStr = new Date(ev.start_datetime).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    });
                    const isCompleted = ev.status === "completed";

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className={`p-2 rounded-xl border text-xs cursor-pointer transition-all shadow-2xs hover:shadow-xs ${
                          isCompleted
                            ? "bg-slate-50 border-slate-200 opacity-70"
                            : "bg-white border-slate-200 hover:border-emerald-300"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="flex items-center gap-1 font-medium text-slate-600">
                            <Clock className="h-3 w-3" />
                            {timeStr}
                          </span>
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              ev.priority === "high"
                                ? "bg-rose-500"
                                : ev.priority === "medium"
                                ? "bg-amber-400"
                                : "bg-blue-400"
                            }`}
                          />
                        </div>

                        <div className={`font-semibold text-slate-900 truncate ${isCompleted ? "line-through text-slate-500" : ""}`}>
                          {ev.title}
                        </div>

                        <div className="mt-1 flex items-center gap-1">
                          <ActivityTypeBadge activityType={ev.activity_type} showIcon={false} className="text-[10px] py-0 px-1.5" />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeeklyView;
