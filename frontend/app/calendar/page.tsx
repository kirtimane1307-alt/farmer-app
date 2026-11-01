"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button, ErrorState } from "@/components/ui";
import {
  CalendarHeader,
  CalendarFilters,
  MonthlyView,
  WeeklyView,
  DailyView,
  CalendarEventModal,
  CalendarEventDetailsModal,
  DeleteCalendarEventDialog,
  CalendarViewMode,
} from "@/components/calendar";
import { calendarApi } from "@/lib/api/calendar";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { cropsApi } from "@/lib/api/crops";
import { labourApi } from "@/lib/api/labour";
import {
  CalendarEvent,
  CalendarSummary,
  CalendarEventCreatePayload,
  CalendarEventUpdatePayload,
  CalendarEventStatus,
  Farm,
  Field,
  Crop,
  Labour,
} from "@/types";
import {
  Calendar as CalendarIcon,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertTriangle,
  CalendarDays,
  Check,
} from "lucide-react";

export default function CalendarPage() {
  // Navigation & View States
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");

  // Filters State
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [selectedCropId, setSelectedCropId] = useState<string>("");
  const [selectedActivityType, setSelectedActivityType] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data States
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [labours, setLabours] = useState<Labour[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals State
  const [isEventModalOpen, setIsEventModalOpen] = useState<boolean>(false);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>(undefined);
  const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [selectedDetailsEvent, setSelectedDetailsEvent] = useState<CalendarEvent | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [deletingEvent, setDeletingEvent] = useState<CalendarEvent | null>(null);

  // Auto-dismiss success notification
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  // Compute date range for query based on view mode and currentDate
  const queryDateRange = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === "month") {
      // Pad by +/- 10 days to cover leading/trailing grid days from adjoining months
      const start = new Date(year, month, 1);
      start.setDate(start.getDate() - 10);
      const end = new Date(year, month + 1, 0);
      end.setDate(end.getDate() + 10);

      const toISO = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      return {
        start_date: toISO(start),
        end_date: toISO(end),
      };
    } else if (viewMode === "week") {
      const dayOfWeek = currentDate.getDay();
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - dayOfWeek - 1); // 1 extra day buffer
      const end = new Date(start);
      end.setDate(start.getDate() + 8); // 8 days buffer

      const toISO = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      return {
        start_date: toISO(start),
        end_date: toISO(end),
      };
    } else {
      // Day view: fetch day +/- 2 days
      const d = selectedDate;
      const start = new Date(d);
      start.setDate(d.getDate() - 2);
      const end = new Date(d);
      end.setDate(d.getDate() + 2);

      const toISO = (dt: Date) =>
        `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

      return {
        start_date: toISO(start),
        end_date: toISO(end),
      };
    }
  }, [currentDate, selectedDate, viewMode]);

  // Fetch Calendar Data
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [eventsRes, summaryRes, farmsRes, fieldsRes, cropsRes, labourRes] =
        await Promise.all([
          calendarApi.getEvents({
            start_date: queryDateRange.start_date,
            end_date: queryDateRange.end_date,
            farm_id: selectedFarmId || undefined,
            field_id: selectedFieldId || undefined,
            crop_id: selectedCropId || undefined,
            activity_type: selectedActivityType || undefined,
            status: selectedStatus || undefined,
            priority: selectedPriority || undefined,
            search: searchQuery.trim() || undefined,
          }),
          calendarApi.getCalendarSummary({
            start_date: queryDateRange.start_date,
            end_date: queryDateRange.end_date,
            farm_id: selectedFarmId || undefined,
          }),
          farmsApi.getFarms(),
          fieldsApi.getFields(),
          cropsApi.getCrops(),
          labourApi.getLabour(),
        ]);

      if (eventsRes.error) throw new Error(eventsRes.error);
      setEvents(eventsRes.data || []);

      if (summaryRes.data) {
        setSummary(summaryRes.data);
      }

      setFarms(farmsRes.data || []);
      setFields(fieldsRes.data || []);
      setCrops(cropsRes.data || []);
      setLabours(labourRes.data || []);
    } catch (err: any) {
      console.error("Error fetching calendar data:", err);
      setError(err.message || "Failed to load calendar activities.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    queryDateRange,
    selectedFarmId,
    selectedFieldId,
    selectedCropId,
    selectedActivityType,
    selectedStatus,
    selectedPriority,
    searchQuery,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  // Period Navigation Handlers
  const handlePreviousPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === "month") {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
      setSelectedDate(next);
    }
    setCurrentDate(next);
  };

  const handleNextPeriod = () => {
    const next = new Date(currentDate);
    if (viewMode === "month") {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
      setSelectedDate(next);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Date Selection Handlers
  const handleSelectDateFromMonthly = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setViewMode("day");
  };

  const handleSelectDateFromWeekly = (date: Date) => {
    setSelectedDate(date);
    setCurrentDate(date);
    setViewMode("day");
  };

  // Event Open & Details
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedDetailsEvent(event);
    setIsDetailsModalOpen(true);
  };

  // Event Creation & Edit Handlers
  const handleOpenAddModal = (date?: Date) => {
    setEventToEdit(null);
    setModalInitialDate(date || selectedDate || new Date());
    setIsEventModalOpen(true);
  };

  const handleOpenEditModal = (event: CalendarEvent) => {
    setEventToEdit(event);
    setModalInitialDate(new Date(event.start_datetime));
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = async (
    payload: CalendarEventCreatePayload | CalendarEventUpdatePayload
  ) => {
    if (eventToEdit) {
      const res = await calendarApi.updateEvent(
        eventToEdit.id,
        payload as CalendarEventUpdatePayload
      );
      if (res.error) throw new Error(res.error);
      setSuccessBanner(`Activity "${res.data?.title}" updated successfully.`);
    } else {
      const res = await calendarApi.createEvent(
        payload as CalendarEventCreatePayload
      );
      if (res.error) throw new Error(res.error);
      setSuccessBanner(`Activity "${res.data?.title}" scheduled successfully.`);
    }
    setIsEventModalOpen(false);
    setEventToEdit(null);
    fetchData();
  };

  // Status Change Handlers
  const handleStatusChange = async (
    eventId: string,
    newStatus: CalendarEventStatus | string
  ) => {
    const res = await calendarApi.updateEventStatus(eventId, {
      status: newStatus as CalendarEventStatus,
    });
    if (res.error) throw new Error(res.error);

    // Update in-place if viewing details modal
    if (selectedDetailsEvent && selectedDetailsEvent.id === eventId && res.data) {
      setSelectedDetailsEvent(res.data);
    }

    setSuccessBanner(
      `Activity marked as ${newStatus.replace("_", " ")}.`
    );
    fetchData();
  };

  // Event Delete Handlers
  const handleDeleteEventClick = (event: CalendarEvent) => {
    setDeletingEvent(event);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async (eventId: string) => {
    const res = await calendarApi.deleteEvent(eventId);
    if (res.error) throw new Error(res.error);
    setSuccessBanner("Activity deleted from calendar.");
    if (selectedDetailsEvent?.id === eventId) {
      setIsDetailsModalOpen(false);
      setSelectedDetailsEvent(null);
    }
    fetchData();
  };

  // Reset Filters
  const handleClearFilters = () => {
    setSelectedFarmId("");
    setSelectedFieldId("");
    setSelectedCropId("");
    setSelectedActivityType("");
    setSelectedStatus("");
    setSelectedPriority("");
    setSearchQuery("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Farm Activity Calendar"
          description="Schedule, coordinate, and track field operations, crop inspections, spray intervals, and workforce tasks across all farms."
          phaseBadge="Phase 16"
          breadcrumbs={[
            { label: "Operations", href: "/calendar" },
            { label: "Calendar Schedule" },
          ]}
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenAddModal(selectedDate)}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs"
            >
              <Plus className="h-4 w-4" />
              Schedule Activity
            </Button>
          }
        />

        {/* Success Banner */}
        {successBanner && (
          <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm shadow-xs transition-all animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-medium flex-1">{successBanner}</span>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-0.5 rounded"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Total Activities
                </span>
                <CalendarDays className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900">
                {summary.total_events}
              </div>
              <p className="text-xs text-slate-500 mt-1">In selected range</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Planned
                </span>
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {summary.planned_count}
              </div>
              <p className="text-xs text-slate-500 mt-1">Awaiting execution</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">
                  In Progress
                </span>
                <PlayCircle className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-700">
                {summary.in_progress_count}
              </div>
              <p className="text-xs text-slate-500 mt-1">Currently active</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium uppercase tracking-wider">
                  Completed
                </span>
                <Check className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-700">
                {summary.completed_count}
              </div>
              <p className="text-xs text-slate-500 mt-1">Successfully finished</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <ErrorState
            title="Unable to load calendar"
            message={error}
            onRetry={fetchData}
          />
        )}

        {/* Calendar Header Navigation */}
        <CalendarHeader
          currentDate={currentDate}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onPreviousPeriod={handlePreviousPeriod}
          onNextPeriod={handleNextPeriod}
          onToday={handleToday}
          onAddActivity={() => handleOpenAddModal(selectedDate)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Filters Panel */}
        <CalendarFilters
          farms={farms}
          fields={fields}
          crops={crops}
          selectedFarmId={selectedFarmId}
          onFarmChange={setSelectedFarmId}
          selectedFieldId={selectedFieldId}
          onFieldChange={setSelectedFieldId}
          selectedCropId={selectedCropId}
          onCropChange={setSelectedCropId}
          selectedActivityType={selectedActivityType}
          onActivityTypeChange={setSelectedActivityType}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedPriority={selectedPriority}
          onPriorityChange={setSelectedPriority}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearFilters={handleClearFilters}
        />

        {/* Active View: Monthly, Weekly, or Daily */}
        {viewMode === "month" && (
          <MonthlyView
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDateFromMonthly}
            events={events}
            onSelectEvent={handleSelectEvent}
            isLoading={isLoading}
          />
        )}

        {viewMode === "week" && (
          <WeeklyView
            currentDate={currentDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDateFromWeekly}
            events={events}
            onSelectEvent={handleSelectEvent}
            onAddEventForDate={(date) => handleOpenAddModal(date)}
          />
        )}

        {viewMode === "day" && (
          <DailyView
            selectedDate={selectedDate}
            events={events}
            onSelectEvent={handleSelectEvent}
            onAddEventForDate={(date) => handleOpenAddModal(date)}
            onQuickStatusChange={handleStatusChange}
            isLoading={isLoading}
          />
        )}

        {/* Add / Edit Activity Modal */}
        <CalendarEventModal
          isOpen={isEventModalOpen}
          onClose={() => {
            setIsEventModalOpen(false);
            setEventToEdit(null);
          }}
          onSubmit={handleSaveEvent}
          eventToEdit={eventToEdit}
          initialDate={modalInitialDate}
          farms={farms}
          fields={fields}
          crops={crops}
          labours={labours}
        />

        {/* Event Details Modal */}
        <CalendarEventDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setSelectedDetailsEvent(null);
          }}
          event={selectedDetailsEvent}
          onEdit={(event) => handleOpenEditModal(event)}
          onDelete={(event) => handleDeleteEventClick(event)}
          onStatusChange={handleStatusChange}
        />

        {/* Delete Confirmation Dialog */}
        <DeleteCalendarEventDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingEvent(null);
          }}
          event={deletingEvent}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </DashboardLayout>
  );
}
