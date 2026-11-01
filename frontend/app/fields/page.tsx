"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { EmptyState, Button, Input, Select, Badge } from "@/components/ui";
import { FieldCard } from "@/components/fields/FieldCard";
import { FieldFormModal } from "@/components/fields/FieldFormModal";
import { DeleteFieldDialog } from "@/components/fields/DeleteFieldDialog";
import { fieldsApi } from "@/lib/api/fields";
import { farmsApi } from "@/lib/api/farms";
import { Farm, Field } from "@/types";
import {
  Layers,
  Plus,
  Search,
  Filter,
  Tractor,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

export default function FieldsPage() {
  const router = useRouter();
  const [fields, setFields] = useState<Field[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFarmId, setSelectedFarmId] = useState<string>("all");

  // Modal states
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState<Field | null>(null);
  const [targetFarmId, setTargetFarmId] = useState<string>("");

  const [isDeleteFieldOpen, setIsDeleteFieldOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<Field | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [farmsRes, fieldsRes] = await Promise.all([
        farmsApi.getFarms(),
        fieldsApi.getAllFields(),
      ]);

      if (farmsRes.data) {
        setFarms(farmsRes.data);
      }
      if (fieldsRes.data) {
        setFields(fieldsRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load fields.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Farm lookup map
  const farmMap = useMemo(() => {
    const map = new Map<string, Farm>();
    farms.forEach((f) => map.set(f.id, f));
    return map;
  }, [farms]);

  // Filtered fields
  const filteredFields = useMemo(() => {
    return fields.filter((f) => {
      const matchesFarm = selectedFarmId === "all" || f.farm_id === selectedFarmId;
      const farm = farmMap.get(f.farm_id);
      const farmName = farm?.name || "";

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        f.name.toLowerCase().includes(q) ||
        (f.soil_type && f.soil_type.toLowerCase().includes(q)) ||
        (f.irrigation_type && f.irrigation_type.toLowerCase().includes(q)) ||
        farmName.toLowerCase().includes(q);

      return matchesFarm && matchesSearch;
    });
  }, [fields, selectedFarmId, searchQuery, farmMap]);

  const handleOpenAddField = () => {
    if (farms.length === 0) return;
    const initialFarmId = selectedFarmId !== "all" ? selectedFarmId : farms[0].id;
    setTargetFarmId(initialFarmId);
    setFieldToEdit(null);
    setIsFieldModalOpen(true);
  };

  const handleOpenEditField = (field: Field) => {
    setTargetFarmId(field.farm_id);
    setFieldToEdit(field);
    setIsFieldModalOpen(true);
  };

  const handleOpenDeleteField = (field: Field) => {
    setFieldToDelete(field);
    setIsDeleteFieldOpen(true);
  };

  const handleFieldSaveSuccess = (savedField: Field) => {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === savedField.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = savedField;
        return updated;
      }
      return [savedField, ...prev];
    });
  };

  const handleFieldDeleteSuccess = (deletedId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== deletedId));
  };

  const targetFarm = farmMap.get(targetFarmId);

  return (
    <DashboardLayout>
      <PageHeader
        title="Fields & Sub-Plots"
        description="Subdivide farms into cultivated zones, classify soil profiles, and configure irrigation sources."
        phaseBadge="Phase 5"
        breadcrumbs={[{ label: "Farms", href: "/farms" }, { label: "Fields & Plots" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              title="Refresh fields"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            {farms.length > 0 && (
              <Button variant="primary" size="sm" onClick={handleOpenAddField}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Field Plot
              </Button>
            )}
          </div>
        }
      />

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Error loading field plots</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
            Retry
          </Button>
        </div>
      )}

      {/* When user has no farms at all */}
      {!isLoading && farms.length === 0 ? (
        <EmptyState
          icon={Tractor}
          title="No Farms Available"
          description="You need to register at least one farm landholding before creating and subdividing field plots."
          phaseBadge="Phase 5"
          actionLabel="Register a Farm First"
          onAction={() => router.push("/farms")}
        />
      ) : (
        <>
          {/* Filters Bar */}
          <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-earth-200 shadow-2xs">
            <div className="w-full md:w-72">
              <Input
                placeholder="Search plots, soil, or farm..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-full md:w-60">
                <Select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  options={[
                    { value: "all", label: "All Landholdings" },
                    ...farms.map((f) => ({ value: f.id, label: f.name })),
                  ]}
                />
              </div>

              <div className="text-xs text-earth-500 whitespace-nowrap">
                <span className="font-semibold text-earth-900">{filteredFields.length}</span> plot(s)
              </div>
            </div>
          </div>

          {/* Loading or Content */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-farm-600" />
              <p className="text-sm text-earth-500 font-medium">Loading field plots across your estates...</p>
            </div>
          ) : fields.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No Field Plots Configured Yet"
              description="Fields map to specific sections of your farm, enabling plot-level crop tracking, soil classification, and irrigation scheduling."
              phaseBadge="Phase 5"
              actionLabel="Add Field Plot"
              onAction={handleOpenAddField}
            />
          ) : filteredFields.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-earth-200 space-y-3">
              <p className="text-sm font-medium text-earth-700">No field plots match your active filters.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedFarmId("all");
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFields.map((field) => {
                const parentFarm = farmMap.get(field.farm_id);
                return (
                  <div key={field.id} className="flex flex-col">
                    {/* Parent Farm Header Chip */}
                    {parentFarm && (
                      <div className="mb-1.5 flex items-center justify-between text-[11px] text-earth-500 px-1">
                        <Link
                          href={`/farms/${parentFarm.id}`}
                          className="flex items-center gap-1 font-medium text-farm-700 hover:text-farm-900 transition-colors"
                        >
                          <Tractor className="h-3 w-3" />
                          <span>{parentFarm.name}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </Link>
                        <span>{parentFarm.location}</span>
                      </div>
                    )}
                    <FieldCard
                      field={field}
                      onEdit={handleOpenEditField}
                      onDelete={handleOpenDeleteField}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Field Form Modal */}
      {targetFarm && (
        <FieldFormModal
          isOpen={isFieldModalOpen}
          farmId={targetFarm.id}
          farmName={targetFarm.name}
          defaultAreaUnit={targetFarm.area_unit}
          fieldToEdit={fieldToEdit}
          onClose={() => setIsFieldModalOpen(false)}
          onSuccess={handleFieldSaveSuccess}
        />
      )}

      {/* Delete Field Dialog */}
      <DeleteFieldDialog
        isOpen={isDeleteFieldOpen}
        field={fieldToDelete}
        onClose={() => setIsDeleteFieldOpen(false)}
        onSuccess={handleFieldDeleteSuccess}
      />
    </DashboardLayout>
  );
}
