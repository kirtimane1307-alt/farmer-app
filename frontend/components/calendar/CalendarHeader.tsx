import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Plus,
  RefreshCw,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui";

export type CalendarViewMode = "month" | "week" | "day";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onPreviousPeriod: () => void;
  onNextPeriod: () => void;
  onToday: () => void;
  onAddActivity: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onViewModeChange,
  onPreviousPeriod,
  onNextPeriod,
  onToday,
  onAddActivity,
  onRefresh,
  isRefreshing = false,
}: CalendarHeaderProps) {
  // Format header title based on current view mode
  const getHeaderTitle = () => {
    if (viewMode === "month") {
      return currentDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    } else if (viewMode === "week") {
      // Calculate start and end of week (Sunday to Saturday)
      const dayOfWeek = currentDate.getDay();
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);

      const sameMonth = start.getMonth() === end.getMonth();
      if (sameMonth) {
        return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { day: "numeric", year: "numeric" })}`;
      }
      return `${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      return currentDate.toLocaleDateString(undefined, {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
      {/* Left: Navigation and Title */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
          <button
            onClick={onPreviousPeriod}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-xs transition-all"
            title="Previous period"
            aria-label="Previous period"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={onToday}
            className="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-white hover:shadow-xs rounded-lg transition-all"
          >
            Today
          </button>
          <button
            onClick={onNextPeriod}
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white hover:shadow-xs transition-all"
            title="Next period"
            aria-label="Next period"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 min-w-[200px]">
          {getHeaderTitle()}
        </h2>
      </div>

      {/* Right: View Mode Toggle & Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View mode toggle */}
        <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 text-xs font-medium">
          <button
            onClick={() => onViewModeChange("month")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "month"
                ? "bg-white text-emerald-800 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Month
          </button>
          <button
            onClick={() => onViewModeChange("week")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "week"
                ? "bg-white text-emerald-800 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onViewModeChange("day")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewMode === "day"
                ? "bg-white text-emerald-800 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Day
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-1.5 text-xs text-slate-600"
          title="Refresh activities"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Sync</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onAddActivity}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Add Activity</span>
        </Button>
      </div>
    </div>
  );
}

export default CalendarHeader;
