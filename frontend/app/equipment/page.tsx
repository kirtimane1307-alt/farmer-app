"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { EmptyState, Button } from "@/components/ui";
import {
  Equipment,
  EquipmentCreatePayload,
  EquipmentUpdatePayload,
  EquipmentMaintenance,
  EquipmentMaintenanceCreatePayload,
  EquipmentMaintenanceUpdatePayload,
  EquipmentSummary,
  Farm,
  Field,
} from "@/types";
import { equipmentApi } from "@/lib/api/equipment";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import {
  EquipmentSummaryCards,
  EquipmentFilters,
  EquipmentTable,
  EquipmentCard,
  EquipmentFormModal,
  EquipmentDetailsModal,
  MaintenanceFormModal,
  DeleteEquipmentDialog,
} from "@/components/equipment";
import {
  Wrench,
  Plus,
  LayoutGrid,
  List as ListIcon,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function EquipmentPage() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [summary, setSummary] = useState<EquipmentSummary | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Filters
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("");
  const [selectedServiceStatus, setSelectedServiceStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  const [detailsEquipment, setDetailsEquipment] = useState<Equipment | null>(null);

  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceEquipment, setMaintenanceEquipment] = useState<Equipment | null>(null);
  const [editingMaintenance, setEditingMaintenance] = useState<EquipmentMaintenance | null>(null);

  const [deletingEquipment, setDeletingEquipment] = useState<Equipment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load farms & fields once
  useEffect(() => {
    async function loadFarmsAndFields() {
      try {
        const [farmsRes, fieldsRes] = await Promise.all([
          farmsApi.getFarms(),
          fieldsApi.getFields(),
        ]);
        if (farmsRes.data) setFarms(farmsRes.data);
        if (fieldsRes.data) setFields(fieldsRes.data);
      } catch (err) {
        console.error("Failed to load farms and fields:", err);
      }
    }
    loadFarmsAndFields();
  }, []);

  // Fetch equipment and summary
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [listRes, summaryRes] = await Promise.all([
        equipmentApi.getEquipment({
          farm_id: selectedFarmId || undefined,
          field_id: selectedFieldId || undefined,
          equipment_type: selectedType || undefined,
          operational_status: selectedStatus || undefined,
          condition: selectedCondition || undefined,
          service_status: selectedServiceStatus || undefined,
          search: searchQuery || undefined,
        }),
        equipmentApi.getEquipmentSummary({
          farm_id: selectedFarmId || undefined,
          field_id: selectedFieldId || undefined,
        }),
      ]);

      if (listRes.data) {
        setEquipmentList(listRes.data);
      }
      if (summaryRes.data) {
        setSummary(summaryRes.data);
      }
    } catch (err: any) {
      console.error("Error fetching equipment:", err);
      setError(
        err?.message ||
          "Failed to load equipment and machinery records. Please check backend connection."
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedFarmId,
    selectedFieldId,
    selectedType,
    selectedStatus,
    selectedCondition,
    selectedServiceStatus,
    searchQuery,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh single equipment details modal
  const refreshDetailsModal = async (equipmentId: string) => {
    try {
      const res = await equipmentApi.getEquipmentById(equipmentId);
      if (res.data) {
        setDetailsEquipment(res.data);
      }
    } catch (err) {
      console.error("Failed to refresh details modal:", err);
    }
  };

  // Handlers for Add/Edit Equipment
  const handleOpenAddModal = () => {
    setEditingEquipment(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (eq: Equipment) => {
    setEditingEquipment(eq);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (
    payload: EquipmentCreatePayload | EquipmentUpdatePayload
  ) => {
    setIsSubmitting(true);
    try {
      if (editingEquipment) {
        await equipmentApi.updateEquipment(editingEquipment.id, payload as EquipmentUpdatePayload);
      } else {
        await equipmentApi.createEquipment(payload as EquipmentCreatePayload);
      }
      setIsFormModalOpen(false);
      setEditingEquipment(null);
      await fetchData();
      if (detailsEquipment && editingEquipment && detailsEquipment.id === editingEquipment.id) {
        await refreshDetailsModal(editingEquipment.id);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to save equipment record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handlers for Maintenance Log
  const handleOpenMaintenanceModal = (eq: Equipment, record?: EquipmentMaintenance) => {
    setMaintenanceEquipment(eq);
    setEditingMaintenance(record || null);
    setMaintenanceModalOpen(true);
  };

  const handleMaintenanceSubmit = async (
    payload: EquipmentMaintenanceCreatePayload | EquipmentMaintenanceUpdatePayload
  ) => {
    if (!maintenanceEquipment) return;
    setIsSubmitting(true);
    try {
      if (editingMaintenance) {
        await equipmentApi.updateEquipmentMaintenance(
          maintenanceEquipment.id,
          editingMaintenance.id,
          payload as EquipmentMaintenanceUpdatePayload
        );
      } else {
        await equipmentApi.createEquipmentMaintenance(
          maintenanceEquipment.id,
          payload as EquipmentMaintenanceCreatePayload
        );
      }
      setMaintenanceModalOpen(false);
      setEditingMaintenance(null);
      await fetchData();
      if (detailsEquipment && detailsEquipment.id === maintenanceEquipment.id) {
        await refreshDetailsModal(maintenanceEquipment.id);
      }
    } catch (err: any) {
      alert(err?.message || "Failed to save maintenance record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaintenance = async (record: EquipmentMaintenance) => {
    if (!detailsEquipment) return;
    if (!confirm("Are you sure you want to delete this maintenance record?")) return;
    try {
      await equipmentApi.deleteEquipmentMaintenance(detailsEquipment.id, record.id);
      await refreshDetailsModal(detailsEquipment.id);
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete maintenance record.");
    }
  };

  // Handlers for Delete / Retire Equipment
  const handleOpenDeleteModal = (eq: Equipment) => {
    setDeletingEquipment(eq);
  };

  const handleConfirmDelete = async (eq: Equipment, force?: boolean) => {
    setIsSubmitting(true);
    try {
      await equipmentApi.deleteEquipment(eq.id, force || false);
      setDeletingEquipment(null);
      if (detailsEquipment && detailsEquipment.id === eq.id) {
        setDetailsEquipment(null);
      }
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete equipment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetireEquipment = async (eq: Equipment) => {
    setIsSubmitting(true);
    try {
      await equipmentApi.updateEquipmentStatus(eq.id, {
        operational_status: "retired",
        notes: "Equipment decommissioned and retired.",
      });
      setDeletingEquipment(null);
      if (detailsEquipment && detailsEquipment.id === eq.id) {
        await refreshDetailsModal(eq.id);
      }
      await fetchData();
    } catch (err: any) {
      alert(err?.message || "Failed to retire equipment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFilters = () => {
    setSelectedFarmId("");
    setSelectedFieldId("");
    setSelectedType("");
    setSelectedStatus("");
    setSelectedCondition("");
    setSelectedServiceStatus("");
    setSearchQuery("");
  };

  const hasActiveFilters =
    Boolean(selectedFarmId) ||
    Boolean(selectedFieldId) ||
    Boolean(selectedType) ||
    Boolean(selectedStatus) ||
    Boolean(selectedCondition) ||
    Boolean(selectedServiceStatus) ||
    Boolean(searchQuery);

  return (
    <DashboardLayout>
      <PageHeader
        title="Machinery & Equipment Management"
        description="Catalog tractors, pumps, harvesters, and tools. Track operational health, service schedules, and repair expenditures."
        phaseBadge="Phase 13"
        breadcrumbs={[
          { label: "Resources", href: "/equipment" },
          { label: "Machinery & Equipment" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              title="Refresh Fleet Data"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenAddModal}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Register Equipment
            </Button>
          </div>
        }
      />

      {/* 1. Summary Cards */}
      <EquipmentSummaryCards summary={summary} isLoading={isLoading} />

      {/* 2. Multi-Criteria Filters */}
      <EquipmentFilters
        farms={farms}
        fields={fields}
        selectedFarmId={selectedFarmId}
        selectedFieldId={selectedFieldId}
        selectedType={selectedType}
        selectedStatus={selectedStatus}
        selectedCondition={selectedCondition}
        selectedServiceStatus={selectedServiceStatus}
        searchQuery={searchQuery}
        onFarmChange={setSelectedFarmId}
        onFieldChange={setSelectedFieldId}
        onTypeChange={setSelectedType}
        onStatusChange={setSelectedStatus}
        onConditionChange={setSelectedCondition}
        onServiceStatusChange={setSelectedServiceStatus}
        onSearchChange={setSearchQuery}
        onReset={handleResetFilters}
      />

      {/* 3. Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-sm text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Retry
          </Button>
        </div>
      )}

      {/* 4. Controls: View Switcher & Result Count */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-earth-500 font-medium">
          Showing <strong className="text-earth-800 font-semibold">{equipmentList.length}</strong>{" "}
          machinery item{equipmentList.length !== 1 ? "s" : ""}
          {hasActiveFilters && " (Filtered)"}
        </div>

        <div className="flex items-center bg-earth-100 p-0.5 rounded-lg border border-earth-200">
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md text-xs flex items-center gap-1 font-medium transition-colors ${
              viewMode === "table"
                ? "bg-white text-earth-900 shadow-2xs"
                : "text-earth-500 hover:text-earth-800"
            }`}
            title="Table View"
          >
            <ListIcon className="h-3.5 w-3.5" />
            <span>Table</span>
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md text-xs flex items-center gap-1 font-medium transition-colors ${
              viewMode === "grid"
                ? "bg-white text-earth-900 shadow-2xs"
                : "text-earth-500 hover:text-earth-800"
            }`}
            title="Grid View"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Grid</span>
          </button>
        </div>
      </div>

      {/* 5. Main Content: Empty State vs Table/Grid */}
      {!isLoading && equipmentList.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title={
            hasActiveFilters
              ? "No Equipment Matches Criteria"
              : "No Farm Machinery Registered Yet"
          }
          description={
            hasActiveFilters
              ? "Try broadening your search keyword or clearing status and date schedule filters."
              : "Start by cataloging your tractors, submersible pumps, sprayers, and implements to track schedules, warranty, and repairs."
          }
          actionLabel={hasActiveFilters ? "Clear All Filters" : "Register First Implement"}
          onAction={hasActiveFilters ? handleResetFilters : handleOpenAddModal}
        />
      ) : viewMode === "table" ? (
        <EquipmentTable
          equipmentList={equipmentList}
          isLoading={isLoading}
          onViewDetails={(eq) => setDetailsEquipment(eq)}
          onEdit={handleOpenEditModal}
          onAddMaintenance={(eq) => handleOpenMaintenanceModal(eq)}
          onDelete={handleOpenDeleteModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipmentList.map((item) => (
            <EquipmentCard
              key={item.id}
              equipment={item}
              onViewDetails={(eq) => setDetailsEquipment(eq)}
              onEdit={handleOpenEditModal}
              onAddMaintenance={(eq) => handleOpenMaintenanceModal(eq)}
              onDelete={handleOpenDeleteModal}
            />
          ))}
        </div>
      )}

      {/* 6. Modals */}
      {/* Add / Edit Equipment Modal */}
      <EquipmentFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingEquipment(null);
        }}
        onSubmit={handleFormSubmit}
        equipment={editingEquipment}
        farms={farms}
        fields={fields}
        isLoading={isSubmitting}
      />

      {/* Equipment Details & Service History Modal */}
      <EquipmentDetailsModal
        isOpen={Boolean(detailsEquipment)}
        onClose={() => setDetailsEquipment(null)}
        equipment={detailsEquipment}
        onEdit={(eq) => {
          setDetailsEquipment(null);
          handleOpenEditModal(eq);
        }}
        onAddMaintenance={(eq) => handleOpenMaintenanceModal(eq)}
        onEditMaintenance={(rec) => {
          if (detailsEquipment) {
            handleOpenMaintenanceModal(detailsEquipment, rec);
          }
        }}
        onDeleteMaintenance={handleDeleteMaintenance}
      />

      {/* Maintenance Form Modal */}
      <MaintenanceFormModal
        isOpen={maintenanceModalOpen}
        onClose={() => {
          setMaintenanceModalOpen(false);
          setEditingMaintenance(null);
        }}
        onSubmit={handleMaintenanceSubmit}
        equipment={maintenanceEquipment}
        record={editingMaintenance}
        isLoading={isSubmitting}
      />

      {/* Delete / Retire Equipment Modal */}
      <DeleteEquipmentDialog
        isOpen={Boolean(deletingEquipment)}
        onClose={() => setDeletingEquipment(null)}
        equipment={deletingEquipment}
        onConfirmDelete={handleConfirmDelete}
        onRetireEquipment={handleRetireEquipment}
        isLoading={isSubmitting}
      />
    </DashboardLayout>
  );
}
