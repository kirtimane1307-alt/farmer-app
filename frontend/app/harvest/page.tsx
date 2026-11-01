"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { EmptyState, Button } from "@/components/ui";
import {
  Package,
  Plus,
  RefreshCw,
  AlertCircle,
  Wheat,
} from "lucide-react";
import {
  Harvest,
  HarvestSummary,
  HarvestFormData,
  HarvestFilterParams,
  Farm,
  Field,
  Crop,
} from "@/types";
import { harvestApi } from "@/lib/api/harvest";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { cropsApi } from "@/lib/api/crops";
import {
  HarvestSummaryCards,
  HarvestFilters,
  HarvestTable,
  HarvestFormModal,
  HarvestDetailsModal,
  DeleteHarvestDialog,
} from "@/components/harvest";

export default function HarvestPage() {
  // Data states
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [summary, setSummary] = useState<HarvestSummary | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);

  // Filter state
  const [filters, setFilters] = useState<HarvestFilterParams>({});

  // Loading & Error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [harvestToEdit, setHarvestToEdit] = useState<Harvest | null>(null);
  const [selectedHarvestForDetails, setSelectedHarvestForDetails] = useState<Harvest | null>(null);
  const [harvestToDelete, setHarvestToDelete] = useState<Harvest | null>(null);

  // 1. Fetch metadata (Farms, Fields, Crops) once
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [farmsRes, fieldsRes, cropsRes] = await Promise.all([
          farmsApi.getFarms(),
          fieldsApi.getFields(),
          cropsApi.getCrops(),
        ]);
        if (farmsRes.data) setFarms(farmsRes.data);
        if (fieldsRes.data) setFields(fieldsRes.data);
        if (cropsRes.data) setCrops(cropsRes.data);
      } catch (err) {
        console.error("Failed to load harvest form metadata:", err);
      }
    }
    loadMetadata();
  }, []);

  // 2. Fetch harvests list
  const fetchHarvests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params: Record<string, string | number | boolean | undefined> = {
        farm_id: filters.farm_id,
        field_id: filters.field_id,
        crop_id: filters.crop_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        unit: filters.unit,
        quality_grade: filters.quality_grade,
        search: filters.search,
      };

      const res = await harvestApi.getHarvests(params);
      if (res.data) {
        setHarvests(res.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch harvests:", err);
      setError(err.message || "Failed to load harvest logs from the server.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // 3. Fetch harvest summary telemetry
  const fetchSummary = useCallback(async () => {
    try {
      setIsSummaryLoading(true);
      const params: Record<string, string | number | boolean | undefined> = {
        farm_id: filters.farm_id,
        field_id: filters.field_id,
        crop_id: filters.crop_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
      };

      const res = await harvestApi.getHarvestSummary(params);
      if (res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error("Failed to load harvest summary:", err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [filters.farm_id, filters.field_id, filters.crop_id, filters.start_date, filters.end_date]);

  // Trigger data reload on filter change
  useEffect(() => {
    fetchHarvests();
    fetchSummary();
  }, [fetchHarvests, fetchSummary]);

  // Handlers
  const handleFilterChange = (newFilters: Partial<HarvestFilterParams>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleResetFilters = () => {
    setFilters({});
  };

  const handleOpenCreateModal = () => {
    setHarvestToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (harvest: Harvest) => {
    setHarvestToEdit(harvest);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (formData: HarvestFormData) => {
    if (harvestToEdit) {
      await harvestApi.updateHarvest(harvestToEdit.id, formData);
    } else {
      await harvestApi.createHarvest(formData);
    }
    await Promise.all([fetchHarvests(), fetchSummary()]);
  };

  const handleDeleteConfirm = async (harvestId: string) => {
    await harvestApi.deleteHarvest(harvestId);
    await Promise.all([fetchHarvests(), fetchSummary()]);
  };

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.farm_id ||
      filters.field_id ||
      filters.crop_id ||
      filters.unit ||
      filters.quality_grade ||
      filters.start_date ||
      filters.end_date
  );

  return (
    <DashboardLayout>
      <PageHeader
        title="Harvest Logs & Yield Management"
        description="Track produce yield weights, measurement units, quality grades, and harvest dates across cultivated field plots."
        phaseBadge="Phase 14"
        breadcrumbs={[
          { label: "Operations", href: "/harvest" },
          { label: "Harvest" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchHarvests();
                fetchSummary();
              }}
              title="Refresh Harvest Data"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              className="bg-farm-600 hover:bg-farm-700 text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Record Harvest Yield
            </Button>
          </div>
        }
      />

      {/* 1. Summary Cards */}
      <HarvestSummaryCards summary={summary} loading={isSummaryLoading} />

      {/* 2. Multi-Attribute Filter Bar */}
      <HarvestFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        farms={farms}
        fields={fields}
        crops={crops}
      />

      {/* 3. Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchHarvests}>
            Retry
          </Button>
        </div>
      )}

      {/* 4. Harvest Records Table or Empty State */}
      {harvests.length > 0 ? (
        <HarvestTable
          harvests={harvests}
          onViewDetails={(h) => setSelectedHarvestForDetails(h)}
          onEdit={(h) => handleOpenEditModal(h)}
          onDelete={(h) => setHarvestToDelete(h)}
          loading={isLoading}
        />
      ) : !isLoading ? (
        <EmptyState
          icon={Package}
          title={hasActiveFilters ? "No Harvests Match Filters" : "No Harvest Yields Recorded"}
          description={
            hasActiveFilters
              ? "No harvest logs found matching your active filter criteria. Try adjusting your search term or clearing some filters."
              : "Start recording crop harvest yields, field weights, packaging units, and quality ratings to monitor farm productivity."
          }
          phaseBadge="Phase 14"
          actionLabel={hasActiveFilters ? "Reset Filters" : "Record First Harvest"}
          onAction={hasActiveFilters ? handleResetFilters : handleOpenCreateModal}
        />
      ) : (
        <HarvestTable
          harvests={[]}
          onViewDetails={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          loading={true}
        />
      )}

      {/* Modals */}
      <HarvestFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        harvestToEdit={harvestToEdit}
        farms={farms}
        fields={fields}
        crops={crops}
      />

      <HarvestDetailsModal
        isOpen={Boolean(selectedHarvestForDetails)}
        onClose={() => setSelectedHarvestForDetails(null)}
        harvest={selectedHarvestForDetails}
        onEdit={(h) => handleOpenEditModal(h)}
        onDelete={(h) => setHarvestToDelete(h)}
      />

      <DeleteHarvestDialog
        isOpen={Boolean(harvestToDelete)}
        onClose={() => setHarvestToDelete(null)}
        harvest={harvestToDelete}
        onConfirm={handleDeleteConfirm}
      />
    </DashboardLayout>
  );
}
