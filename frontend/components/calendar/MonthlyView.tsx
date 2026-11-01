import React from "react";
import { CalendarEvent } from "@/types";
import { ACTIVITY_TYPE_CONFIG } from "./ActivityTypeBadge";
import { Clock, CheckCircle2, AlertTriangle, ChevronRight } from "lucide-react";

interface MonthlyViewProps {
  currentDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  isLoading?: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthlyView({
  currentDate,
  selectedDate,
  onSelectDate,
  events,
  onSelectEvent,
  isLoading = false,
}: MonthlyViewProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month (0 = Sun, 6 = Sat)
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Days in current month (handles leap years automatically)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Today ISO string
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

  // Build grid calendar cells
  const cells: Array<{
    date: Date;
    dateStr: string;
    dayNumber: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
  }> = [];

  // 1. Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, d);
    const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      date: prevDate,
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedStr,
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(year, month, d);
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      date: curDate,
      dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedStr,
    });
  }

  // 3. Next month leading days to complete grid (multiples of 7, up to 35 or 42)
  const totalCells = cells.length;
  const targetCells = totalCells <= 35 ? 35 : 42;
  const remaining = targetCells - totalCells;
  for (let d = 1; d <= remaining; d++) {
    const nextDate = new Date(year, month + 1, d);
    const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({
      date: nextDate,
      dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isSelected: dateStr === selectedStr,
    });
  }

  // Map events to dateStr
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const startStr = ev.start_datetime.split("T")[0];
    const endStr = ev.end_datetime ? ev.end_datetime.split("T")[0] : startStr;

    // Populate for every date cell that overlaps [startStr, endStr]
    for (const cell of cells) {
      if (cell.dateStr >= startStr && cell.dateStr <= endStr) {
        const list = eventsByDate.get(cell.dateStr) || [];
        list.push(ev);
        eventsByDate.set(cell.dateStr, list);
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider py-3">
        {WEEKDAYS.map((day, idx) => (
          <div key={day} className={idx === 0 || idx === 6 ? "text-amber-700" : ""}>
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{day.charAt(0)}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[500px]">
        {cells.map((cell) => {
          const dayEvents = eventsByDate.get(cell.dateStr) || [];
          const visibleEvents = dayEvents.slice(0, 3);
          const extraCount = dayEvents.length - visibleEvents.length;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.date)}
              className={`min-h-[90px] sm:min-h-[110px] p-1.5 sm:p-2 cursor-pointer transition-colors relative flex flex-col justify-between ${
                cell.isCurrentMonth ? "bg-white" : "bg-slate-50/50 text-slate-400"
              } ${cell.isSelected ? "ring-2 ring-emerald-500 ring-inset z-10 bg-emerald-50/20" : "hover:bg-slate-50/80"}`}
            >
              {/* Day Number Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center text-xs font-bold rounded-full h-6 w-6 ${
                    cell.isToday
                      ? "bg-emerald-600 text-white font-extrabold shadow-xs"
                      : cell.isSelected
                      ? "bg-emerald-100 text-emerald-800"
                      : cell.isCurrentMonth
                      ? "text-slate-800"
                      : "text-slate-400"
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-semibold text-slate-400 sm:hidden">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Pills List */}
              <div className="space-y-1 flex-1 overflow-hidden">
                {visibleEvents.map((ev) => {
                  const cfg = ACTIVITY_TYPE_CONFIG[ev.activity_type] || {
                    bg: "bg-slate-100",
                    text: "text-slate-800",
                    border: "border-slate-200",
                  };

                  const isCompleted = ev.status === "completed";

                  return (
                    <button
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate flex items-center gap-1 border transition-all ${
                        isCompleted
                          ? "bg-slate-50 text-slate-500 border-slate-200 line-through"
                          : `${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-90`
                      }`}
                      title={`${ev.title} (${ev.activity_type.replace(/_/g, " ")})`}
                    >
                      {ev.priority === "high" && !isCompleted && (
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                      )}
                      <span className="truncate">{ev.title}</span>
                    </button>
                  );
                })}

                {extraCount > 0 && (
                  <div className="text-[10px] font-semibold text-emerald-700 pl-1">
                    +{extraCount} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthlyView;
