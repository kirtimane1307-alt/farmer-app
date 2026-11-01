"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button, ErrorState } from "@/components/ui";
import {
  ApplicationSummaryCards,
  ApplicationFilters,
  ApplicationTable,
  ApplicationFormModal,
  ApplicationDetailsModal,
  DeleteApplicationDialog,
} from "@/components/applications";
import { applicationsApi } from "@/lib/api/applications";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { cropsApi } from "@/lib/api/crops";
import {
  AgriculturalApplication,
  ApplicationSummary,
  Farm,
  Field,
  Crop,
} from "@/types";
import { Bug, Plus, RefreshCw } from "lucide-react";

export default function PesticidesPage() {
  // Filters
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [selectedCropId, setSelectedCropId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data
  const [applications, setApplications] = useState<AgriculturalApplication[]>([]);
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<AgriculturalApplication | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDetailsApp, setSelectedDetailsApp] = useState<AgriculturalApplication | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingApp, setDeletingApp] = useState<AgriculturalApplication | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [appRes, sumRes, farmsRes, fieldsRes, cropsRes] = await Promise.all([
        applicationsApi.getApplications({
          category: "pesticide",
          farm_id: selectedFarmId || undefined,
          field_id: selectedFieldId || undefined,
          crop_id: selectedCropId || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          search: searchQuery.trim() || undefined,
        }),
        applicationsApi.getApplicationSummary({
          farm_id: selectedFarmId || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        farmsApi.getFarms(),
        selectedFarmId ? fieldsApi.getFieldsForFarm(selectedFarmId) : fieldsApi.getAllFields(),
        cropsApi.getCrops({
          farm_id: selectedFarmId || undefined,
          field_id: selectedFieldId || undefined,
        }),
      ]);

      if (appRes.error) {
        setError(appRes.error);
      } else if (appRes.data) {
        setApplications(appRes.data);
      }

      if (sumRes.data) {
        setSummary(sumRes.data);
      }
      if (farmsRes.data) {
        setFarms(farmsRes.data);
      }
      if (fieldsRes.data) {
        setFields(fieldsRes.data);
      }
      if (cropsRes.data) {
        setCrops(cropsRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedFarmId, selectedFieldId, selectedCropId, startDate, endDate, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleResetFilters = () => {
    setSelectedFarmId("");
    setSelectedFieldId("");
    setSelectedCropId("");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  const handleAddNew = () => {
    setEditingApplication(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (app: AgriculturalApplication) => {
    setEditingApplication(app);
    setIsFormModalOpen(true);
  };

  const handleViewDetails = (app: AgriculturalApplication) => {
    setSelectedDetailsApp(app);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = (app: AgriculturalApplication) => {
    setDeletingApp(app);
    setIsDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Pesticide & Crop Protection"
        description="Monitor protective chemical sprays, target insect and fungal pests, and track protection expenses."
        phaseBadge="Phase 10"
        breadcrumbs={[{ label: "Resources", href: "/pesticides" }, { label: "Pesticides" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="text-earth-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddNew}
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium shadow-2xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Log Protective Spray
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorState title="Error Loading Pesticide Records" message={error} onRetry={fetchData} />
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <ApplicationSummaryCards summary={summary} isLoading={isLoading} categoryFilter="pesticide" />

          {/* Filters */}
          <ApplicationFilters
            farms={farms}
            fields={fields}
            crops={crops}
            selectedCategory="pesticide"
            onCategoryChange={() => {}}
            selectedFarmId={selectedFarmId}
            onFarmChange={setSelectedFarmId}
            selectedFieldId={selectedFieldId}
            onFieldChange={setSelectedFieldId}
            selectedCropId={selectedCropId}
            onCropChange={setSelectedCropId}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onReset={handleResetFilters}
            hideCategoryFilter={true}
          />

          {/* Table */}
          <ApplicationTable
            applications={applications}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddNew={handleAddNew}
            defaultCategory="pesticide"
          />
        </div>
      )}

      {/* Modals */}
      <ApplicationFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingApplication(null);
        }}
        onSuccess={fetchData}
        farms={farms}
        fields={fields}
        crops={crops}
        editingApplication={editingApplication}
        defaultCategory="pesticide"
      />

      <ApplicationDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedDetailsApp(null);
        }}
        application={selectedDetailsApp}
        onEdit={(app) => {
          setIsDetailsModalOpen(false);
          handleEdit(app);
        }}
      />

      <DeleteApplicationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingApp(null);
        }}
        application={deletingApp}
        onSuccess={() => {
          setDeletingApp(null);
          fetchData();
        }}
      />
    </DashboardLayout>
  );
}
