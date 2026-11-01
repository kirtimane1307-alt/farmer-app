"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { EmptyState, Button, Card, Badge } from "@/components/ui";
import {
  LabourCard,
  LabourTable,
  LabourFilters,
  LabourFormModal,
  DeactivateLabourDialog,
  LabourDetailsModal,
} from "@/components/labour";
import { labourApi } from "@/lib/api/labour";
import { farmsApi } from "@/lib/api/farms";
import { Labour, Farm, LabourStats } from "@/types";
import {
  Users,
  Plus,
  RefreshCw,
  AlertCircle,
  Loader2,
  UserCheck,
  UserX,
  IndianRupee,
  Tractor,
} from "lucide-react";

export default function LabourPage() {
  const [labours, setLabours] = useState<Labour[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [stats, setStats] = useState<LabourStats | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedFarmId, setSelectedFarmId] = useState("all");
  const [selectedWorkType, setSelectedWorkType] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modal dialog states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [labourToEdit, setLabourToEdit] = useState<Labour | null>(null);

  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [labourToDeactivate, setLabourToDeactivate] = useState<Labour | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [labourForDetails, setLabourForDetails] = useState<Labour | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [labourRes, farmsRes, statsRes] = await Promise.all([
        labourApi.getLabour(),
        farmsApi.getFarms(),
        labourApi.getLabourStats(),
      ]);

      if (labourRes.error) {
        setError(labourRes.error || "Failed to load labour registry.");
      } else if (labourRes.data) {
        setLabours(labourRes.data);
      }

      if (farmsRes.data) {
        setFarms(farmsRes.data);
      }

      if (statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load workforce data.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    await fetchData(true);
  };

  // Filtered workers list
  const filteredLabours = useMemo(() => {
    return labours.filter((w) => {
      // Status filter
      if (statusFilter !== "all" && w.status !== statusFilter) {
        return false;
      }

      // Farm filter
      if (selectedFarmId !== "all" && w.farm_id !== selectedFarmId) {
        return false;
      }

      // Work trade filter
      if (selectedWorkType !== "all" && w.work_type !== selectedWorkType) {
        return false;
      }

      // Search query (worker name, phone, trade, farm name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = w.name.toLowerCase().includes(q);
        const matchesPhone = w.phone ? w.phone.toLowerCase().includes(q) : false;
        const matchesTrade = w.work_type.toLowerCase().includes(q);
        const matchesFarm = w.farm_name ? w.farm_name.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesPhone && !matchesTrade && !matchesFarm) {
          return false;
        }
      }

      return true;
    });
  }, [labours, statusFilter, selectedFarmId, selectedWorkType, searchQuery]);

  // Aggregate metrics
  const activeCount = labours.filter((w) => w.status === "active").length;
  const inactiveCount = labours.filter((w) => w.status === "inactive").length;
  const totalDailyWages = labours
    .filter((w) => w.status === "active")
    .reduce((sum, w) => sum + Number(w.daily_wage || 0), 0);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    selectedFarmId !== "all" ||
    selectedWorkType !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSelectedFarmId("all");
    setSelectedWorkType("all");
  };

  // Actions
  const handleOpenCreateModal = () => {
    setLabourToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (labour: Labour) => {
    setLabourToEdit(labour);
    setIsFormModalOpen(true);
  };

  const handleOpenDeactivateDialog = (labour: Labour) => {
    setLabourToDeactivate(labour);
    setIsDeactivateDialogOpen(true);
  };

  const handleOpenDetailsModal = (labour: Labour) => {
    setLabourForDetails(labour);
    setIsDetailsModalOpen(true);
  };

  const handleSaveSuccess = (savedWorker: Labour) => {
    setLabours((prev) => {
      const idx = prev.findIndex((w) => w.id === savedWorker.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedWorker;
        return updated;
      }
      return [savedWorker, ...prev];
    });
    // Refresh stats
    labourApi.getLabourStats().then((res) => {
      if (res.data) setStats(res.data);
    });
  };

  const handleDeactivateSuccess = (result: Labour | { id: string; deleted: boolean }) => {
    if ("deleted" in result && result.deleted) {
      setLabours((prev) => prev.filter((w) => w.id !== result.id));
    } else {
      const updatedWorker = result as Labour;
      setLabours((prev) =>
        prev.map((w) => (w.id === updatedWorker.id ? updatedWorker : w))
      );
    }
    // Refresh stats
    labourApi.getLabourStats().then((res) => {
      if (res.data) setStats(res.data);
    });
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <PageHeader
        title="Labour Management"
        description="Maintain farm workforce rosters, daily wage agreements, assigned agricultural roles, and worker status."
        badge="Phase 7 Active"
        breadcrumbs={[{ label: "Workforce", href: "/labour" }, { label: "Labour" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isRefreshing}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Sync Workforce
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Labour
            </Button>
          </div>
        }
      />

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="p-4 bg-white border-earth-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-earth-500">
                Total Workers
              </p>
              <h3 className="text-2xl font-bold text-earth-900 mt-1">
                {isLoading ? "..." : (stats?.total_workers ?? labours.length)}
              </h3>
              <p className="text-xs text-earth-500 mt-0.5">Enrolled personnel</p>
            </div>
            <div className="p-2.5 rounded-xl bg-earth-100 text-earth-700">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-earth-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-earth-500">
                Active Labour
              </p>
              <h3 className="text-2xl font-bold text-farm-800 mt-1">
                {isLoading ? "..." : (stats?.active_workers ?? activeCount)}
              </h3>
              <p className="text-xs text-farm-700 mt-0.5">Ready for duty</p>
            </div>
            <div className="p-2.5 rounded-xl bg-farm-100/70 text-farm-700">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-earth-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-earth-500">
                Inactive Workers
              </p>
              <h3 className="text-2xl font-bold text-amber-800 mt-1">
                {isLoading ? "..." : (stats?.inactive_workers ?? inactiveCount)}
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">On leave / unassigned</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-100/70 text-amber-700">
              <UserX className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border-earth-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-earth-500">
                Active Daily Outflow
              </p>
              <h3 className="text-2xl font-bold text-earth-900 mt-1">
                ₹{isLoading ? "..." : totalDailyWages.toLocaleString()}
              </h3>
              <p className="text-xs text-earth-500 mt-0.5">Full deployment wage</p>
            </div>
            <div className="p-2.5 rounded-xl bg-earth-100 text-earth-700">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="mb-6">
        <LabourFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          selectedFarmId={selectedFarmId}
          onFarmChange={setSelectedFarmId}
          selectedWorkType={selectedWorkType}
          onWorkTypeChange={setSelectedWorkType}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          farms={farms}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-farm-600" />
          <p className="text-sm font-medium text-earth-600">Loading worker directory...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3 max-w-lg mx-auto my-12">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto" />
          <h3 className="text-base font-semibold text-red-900">Unable to Load Workforce</h3>
          <p className="text-xs text-red-700">{error}</p>
          <Button variant="outline" size="sm" onClick={() => fetchData()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry Connection
          </Button>
        </div>
      ) : labours.length === 0 ? (
        // Global empty state
        <EmptyState
          icon={Users}
          title="No labour records yet"
          description="Add your first farm worker to start managing your workforce, roles, daily wage terms, and muster rolls."
          phaseBadge="Phase 7"
          actionLabel="Add Labour"
          onAction={handleOpenCreateModal}
        />
      ) : filteredLabours.length === 0 ? (
        // Filter empty state
        <div className="text-center py-16 bg-white rounded-2xl border border-earth-200 p-8 space-y-3">
          <div className="p-3 bg-earth-100 rounded-full w-fit mx-auto text-earth-600">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-earth-900 text-base">
            No workers matching your criteria
          </h3>
          <p className="text-xs text-earth-500 max-w-sm mx-auto">
            {selectedFarmId !== "all"
              ? "No workers assigned to this farm matching your filters."
              : "Try adjusting your search keywords or clearing active filters."}
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Labour
            </Button>
          </div>
        </div>
      ) : (
        // Worker Roster List / Grid
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-earth-500 font-medium px-1">
            <span>
              Showing {filteredLabours.length} of {labours.length} worker{labours.length === 1 ? "" : "s"}
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-farm-700 hover:text-farm-900 font-semibold"
              >
                Clear all filters
              </button>
            )}
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLabours.map((worker) => (
                <LabourCard
                  key={worker.id}
                  labour={worker}
                  onEdit={handleOpenEditModal}
                  onDeactivate={handleOpenDeactivateDialog}
                  onView={handleOpenDetailsModal}
                />
              ))}
            </div>
          ) : (
            <LabourTable
              labours={filteredLabours}
              onEdit={handleOpenEditModal}
              onDeactivate={handleOpenDeactivateDialog}
            />
          )}
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <LabourFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleSaveSuccess}
        labourToEdit={labourToEdit}
        farms={farms}
        defaultFarmId={selectedFarmId !== "all" ? selectedFarmId : undefined}
      />

      {/* Deactivate Dialog */}
      <DeactivateLabourDialog
        isOpen={isDeactivateDialogOpen}
        onClose={() => setIsDeactivateDialogOpen(false)}
        onSuccess={handleDeactivateSuccess}
        labour={labourToDeactivate}
      />

      {/* Quick Details Modal */}
      <LabourDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        onEdit={handleOpenEditModal}
        onDeactivate={handleOpenDeactivateDialog}
        labour={labourForDetails}
      />
    </DashboardLayout>
  );
}
