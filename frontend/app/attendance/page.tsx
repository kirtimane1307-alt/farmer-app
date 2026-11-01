"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button, EmptyState, ErrorState } from "@/components/ui";
import {
  AttendanceSummaryCards,
  AttendanceFilters,
  AttendanceTable,
  AttendanceFormModal,
  DailyMusterModal,
  DeleteAttendanceDialog,
} from "@/components/attendance";
import { attendanceApi } from "@/lib/api/attendance";
import { labourApi } from "@/lib/api/labour";
import { farmsApi } from "@/lib/api/farms";
import {
  Attendance,
  AttendanceDailySummary,
  Labour,
  Farm,
} from "@/types";
import {
  CalendarCheck,
  Plus,
  Clock,
  RefreshCw,
  ClipboardList,
} from "lucide-react";

export default function AttendancePage() {
  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data states
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceDailySummary | null>(null);
  const [workers, setWorkers] = useState<Labour[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [isMusterModalOpen, setIsMusterModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAttendance, setDeletingAttendance] = useState<Attendance | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [attRes, sumRes, workersRes, farmsRes] = await Promise.all([
        attendanceApi.getAttendance({
          date: selectedDate,
          farm_id: selectedFarmId || undefined,
          status: selectedStatus || undefined,
          search: searchQuery.trim() || undefined,
        }),
        attendanceApi.getAttendanceSummary(selectedDate, selectedFarmId || undefined),
        labourApi.getLabour({
          farm_id: selectedFarmId || undefined,
          status: "active",
        }),
        farmsApi.getFarms(),
      ]);

      if (attRes.error) {
        setError(attRes.error || "Failed to load attendance logs.");
      } else if (attRes.data) {
        setAttendances(attRes.data);
      }

      if (sumRes.data) {
        setSummary(sumRes.data);
      }

      if (workersRes.data) {
        setWorkers(workersRes.data);
      }

      if (farmsRes.data) {
        setFarms(farmsRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading attendance records.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, selectedFarmId, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleResetFilters = () => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
    setSelectedFarmId("");
    setSelectedStatus("");
    setSearchQuery("");
  };

  // Handlers for record actions
  const handleOpenCreateModal = () => {
    setEditingAttendance(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (att: Attendance) => {
    setEditingAttendance(att);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteDialog = (att: Attendance) => {
    setDeletingAttendance(att);
    setIsDeleteDialogOpen(true);
  };

  const handleQuickClockOut = (att: Attendance) => {
    // Open edit modal with now prefilled
    setEditingAttendance(att);
    setIsFormModalOpen(true);
  };

  const handleFormSuccess = () => {
    fetchData();
  };

  const handleDeleteSuccess = () => {
    fetchData();
  };

  const handleMusterSuccess = () => {
    fetchData();
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Labour Attendance & Working Hours"
        description="Daily digital muster roll, check-in/check-out time tracking, automated working hours calculation, and overtime credits."
        phaseBadge="Phase 8"
        breadcrumbs={[{ label: "Workforce", href: "/labour" }, { label: "Attendance" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isRefreshing}
              title="Sync Attendance Logs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Sync
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMusterModalOpen(true)}
              className="text-earth-700 bg-white"
            >
              <ClipboardList className="h-3.5 w-3.5 mr-1.5 text-farm-600" />
              Daily Muster Sheet
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Log Attendance
            </Button>
          </div>
        }
      />

      <div className="space-y-5">
        {/* Top Summary Metrics */}
        <AttendanceSummaryCards summary={summary} isLoading={isLoading} />

        {/* Filter Controls Bar */}
        <AttendanceFilters
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedFarmId={selectedFarmId}
          onFarmChange={setSelectedFarmId}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          farms={farms}
          onReset={handleResetFilters}
        />

        {/* Content Area */}
        {error ? (
          <ErrorState
            title="Failed to Load Attendance"
            message={error}
            onRetry={fetchData}
          />
        ) : !isLoading && attendances.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={`No Attendance Logs for ${selectedDate}`}
            description={
              searchQuery || selectedStatus || selectedFarmId
                ? "No attendance records matched your filter criteria. Try clearing filters or search terms."
                : "No worker attendance has been marked for this date yet. Mark the daily muster sheet or log individual check-in times."
            }
            actionLabel="Mark Daily Muster Roll"
            onAction={() => setIsMusterModalOpen(true)}
          />
        ) : (
          <AttendanceTable
            attendances={attendances}
            isLoading={isLoading}
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteDialog}
            onQuickClockOut={handleQuickClockOut}
          />
        )}
      </div>

      {/* Form Modal (Create / Edit) */}
      <AttendanceFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleFormSuccess}
        attendanceToEdit={editingAttendance}
        workers={workers}
        defaultDate={selectedDate}
      />

      {/* Daily Muster Sheet Modal */}
      <DailyMusterModal
        isOpen={isMusterModalOpen}
        onClose={() => setIsMusterModalOpen(false)}
        onSuccess={handleMusterSuccess}
        workers={workers}
        defaultDate={selectedDate}
        farmId={selectedFarmId || undefined}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteAttendanceDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onSuccess={handleDeleteSuccess}
        attendance={deletingAttendance}
      />
    </DashboardLayout>
  );
}
