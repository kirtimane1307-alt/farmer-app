"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { EmptyState, Button, Input } from "@/components/ui";
import { FarmCard } from "@/components/farms/FarmCard";
import { FarmFormModal } from "@/components/farms/FarmFormModal";
import { DeleteFarmDialog } from "@/components/farms/DeleteFarmDialog";
import { farmsApi } from "@/lib/api/farms";
import { Farm } from "@/types";
import {
  Tractor,
  Plus,
  Search,
  Maximize2,
  Layers,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";

export default function FarmsPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [farmToEdit, setFarmToEdit] = useState<Farm | null>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [farmToDelete, setFarmToDelete] = useState<Farm | null>(null);

  const fetchFarms = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await farmsApi.getFarms();
      if (res.error) {
        setError(res.error);
      } else if (res.data) {
        setFarms(res.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load farms.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFarms();
  }, [fetchFarms]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const totalFarms = farms.length;
    const totalFields = farms.reduce((sum, f) => sum + (f.field_count ?? 0), 0);
    const totalAcreage = farms.reduce((sum, f) => sum + Number(f.total_area || 0), 0);
    return { totalFarms, totalFields, totalAcreage };
  }, [farms]);

  // Filtered list
  const filteredFarms = useMemo(() => {
    if (!searchQuery.trim()) return farms;
    const q = searchQuery.toLowerCase().trim();
    return farms.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.area_unit.toLowerCase().includes(q)
    );
  }, [farms, searchQuery]);

  const handleOpenCreateModal = () => {
    setFarmToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (farm: Farm) => {
    setFarmToEdit(farm);
    setIsFormModalOpen(true);
  };

  const handleOpenDeleteDialog = (farm: Farm) => {
    setFarmToDelete(farm);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveSuccess = (savedFarm: Farm) => {
    setFarms((prev) => {
      const idx = prev.findIndex((f) => f.id === savedFarm.id);
      if (idx >= 0) {
        // Update existing
        const updated = [...prev];
        updated[idx] = { ...savedFarm, field_count: prev[idx].field_count ?? 0 };
        return updated;
      }
      // Prepend newly created farm
      return [savedFarm, ...prev];
    });
  };

  const handleDeleteSuccess = (deletedId: string) => {
    setFarms((prev) => prev.filter((f) => f.id !== deletedId));
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Farm Landholdings"
        description="Register and manage agricultural estate holdings, locations, boundaries, and spatial field subdivisions."
        phaseBadge="Phase 5"
        breadcrumbs={[{ label: "Farms" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFarms}
              disabled={isLoading}
              title="Refresh farm list"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add New Farm
            </Button>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white border border-earth-200 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-farm-100 text-farm-700">
            <Tractor className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-earth-500 font-medium block">Total Landholdings</span>
            <span className="text-xl font-bold text-earth-900">{stats.totalFarms}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-earth-200 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-earth-200 text-earth-800">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-earth-500 font-medium block">Total Field Plots</span>
            <span className="text-xl font-bold text-earth-900">{stats.totalFields}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-earth-200 shadow-2xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-100 text-amber-800">
            <Maximize2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xs text-earth-500 font-medium block">Aggregate Land Area</span>
            <span className="text-xl font-bold text-earth-900">
              {stats.totalAcreage.toLocaleString()} Units
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Failed to load farm data</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchFarms} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* Search and Filters */}
      {farms.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Search farms by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="text-xs text-earth-500">
            Showing <span className="font-semibold text-earth-900">{filteredFarms.length}</span> of{" "}
            <span className="font-semibold text-earth-900">{farms.length}</span> farms
          </div>
        </div>
      )}

      {/* Content States */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-farm-600" />
          <p className="text-sm text-earth-500 font-medium">Loading your farm landholdings...</p>
        </div>
      ) : farms.length === 0 ? (
        <EmptyState
          icon={Tractor}
          title="No Farms Registered Yet"
          description="Start by registering your first agricultural landholding. You will be able to subdivide it into cultivateable plots, assign soil classifications, and schedule crops."
          phaseBadge="Phase 5"
          actionLabel="Register First Farm"
          onAction={handleOpenCreateModal}
        />
      ) : filteredFarms.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-earth-200 space-y-3">
          <p className="text-sm font-medium text-earth-700">No farms matched &ldquo;{searchQuery}&rdquo;</p>
          <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredFarms.map((farm) => (
            <FarmCard
              key={farm.id}
              farm={farm}
              onEdit={handleOpenEditModal}
              onDelete={handleOpenDeleteDialog}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Farm Modal */}
      <FarmFormModal
        isOpen={isFormModalOpen}
        farmToEdit={farmToEdit}
        onClose={() => setIsFormModalOpen(false)}
        onSuccess={handleSaveSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteFarmDialog
        isOpen={isDeleteDialogOpen}
        farm={farmToDelete}
        onClose={() => setIsDeleteDialogOpen(false)}
        onSuccess={handleDeleteSuccess}
      />
    </DashboardLayout>
  );
}
