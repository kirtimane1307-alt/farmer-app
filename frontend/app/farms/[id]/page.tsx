"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Card, Button, Badge, EmptyState } from "@/components/ui";
import { FieldCard } from "@/components/fields/FieldCard";
import { FieldFormModal } from "@/components/fields/FieldFormModal";
import { DeleteFieldDialog } from "@/components/fields/DeleteFieldDialog";
import { FarmFormModal } from "@/components/farms/FarmFormModal";
import { DeleteFarmDialog } from "@/components/farms/DeleteFarmDialog";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { labourApi } from "@/lib/api/labour";
import { Farm, Field, Labour } from "@/types";
import {
  MapPin,
  Maximize2,
  Layers,
  Calendar,
  Edit,
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
  AlertCircle,
  PieChart,
  Users,
} from "lucide-react";

export default function FarmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const farmId = params.id as string;

  const [farm, setFarm] = useState<Farm | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [farmLabour, setFarmLabour] = useState<Labour[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Field Modal States
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [fieldToEdit, setFieldToEdit] = useState<Field | null>(null);

  const [isDeleteFieldOpen, setIsDeleteFieldOpen] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<Field | null>(null);

  // Farm Modal States
  const [isFarmModalOpen, setIsFarmModalOpen] = useState(false);
  const [isDeleteFarmOpen, setIsDeleteFarmOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!farmId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [farmRes, fieldsRes, labourRes] = await Promise.all([
        farmsApi.getFarm(farmId),
        fieldsApi.getFieldsForFarm(farmId),
        labourApi.getFarmLabour(farmId),
      ]);

      if (farmRes.error) {
        setError(farmRes.error);
      } else if (farmRes.data) {
        setFarm(farmRes.data);
      }

      if (fieldsRes.data) {
        setFields(fieldsRes.data);
      }

      if (labourRes.data) {
        setFarmLabour(labourRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load farm details.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Total allocated acreage calculation
  const allocation = useMemo(() => {
    if (!farm) return { totalPlotArea: 0, percentage: 0 };
    const totalPlotArea = fields.reduce((sum, f) => sum + Number(f.area || 0), 0);
    const farmArea = Number(farm.total_area || 0);
    const percentage = farmArea > 0 ? Math.min(100, Math.round((totalPlotArea / farmArea) * 100)) : 0;
    return { totalPlotArea, percentage };
  }, [farm, fields]);

  // Handlers for Fields
  const handleOpenAddField = () => {
    setFieldToEdit(null);
    setIsFieldModalOpen(true);
  };

  const handleOpenEditField = (field: Field) => {
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
      return [...prev, savedField];
    });
  };

  const handleFieldDeleteSuccess = (deletedId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== deletedId));
  };

  // Handlers for Farm
  const handleFarmUpdateSuccess = (updatedFarm: Farm) => {
    setFarm(updatedFarm);
  };

  const handleFarmDeleteSuccess = () => {
    router.push("/farms");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-farm-600" />
          <p className="text-sm text-earth-500 font-medium">Loading farm and plot data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !farm) {
    return (
      <DashboardLayout>
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h3 className="font-semibold text-lg">Farm Not Found or Unauthorized</h3>
            <p className="text-xs text-red-600 max-w-md">
              {error || "The requested farm could not be found or you do not have permission to view it."}
            </p>
          </div>
          <Link href="/farms">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Farms
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const formattedDate = new Date(farm.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <DashboardLayout>
      <PageHeader
        title={farm.name}
        description={`Agricultural estate in ${farm.location}`}
        phaseBadge="Phase 5"
        breadcrumbs={[{ label: "Farms", href: "/farms" }, { label: farm.name }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFarmModalOpen(true)}
              className="text-xs"
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit Farm
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteFarmOpen(true)}
              className="text-xs text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete Farm
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenAddField}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Field Plot
            </Button>
          </div>
        }
      />

      {/* Farm Overview Card */}
      <div className="mb-8 p-6 rounded-2xl bg-white border border-earth-200 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-earth-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-earth-900">{farm.name}</h2>
              <Badge variant="success" size="sm">
                Active Estate
              </Badge>
            </div>
            <div className="flex items-center text-xs text-earth-500 mt-1.5 gap-4">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-earth-400" />
                {farm.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-earth-400" />
                Registered on {formattedDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl bg-farm-50 border border-farm-100 text-right">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-farm-700 block">
                Total Landholding
              </span>
              <span className="text-lg font-bold text-earth-900">
                {Number(farm.total_area).toLocaleString()} {farm.area_unit}
              </span>
            </div>
          </div>
        </div>

        {/* Land Subdivision, Utilization & Labour Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-earth-50/70 border border-earth-100 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-farm-100 text-farm-700">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-earth-500 block">
                Subdivided Plots
              </span>
              <span className="text-lg font-bold text-earth-900">
                {fields.length} {fields.length === 1 ? "Plot" : "Plots"}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-earth-50/70 border border-earth-100 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700">
              <Maximize2 className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-semibold text-earth-500 block">
                Allocated Plot Area
              </span>
              <span className="text-lg font-bold text-earth-900">
                {allocation.totalPlotArea.toLocaleString()} {farm.area_unit}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-earth-50/70 border border-earth-100 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700">
              <PieChart className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold text-earth-500 mb-1">
                <span>Land Utilization</span>
                <span className="font-bold text-earth-900">{allocation.percentage}%</span>
              </div>
              <div className="w-full bg-earth-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-farm-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${allocation.percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Assigned Labour Card (Phase 7 Integration) */}
          <div className="p-4 rounded-xl bg-earth-50/70 border border-earth-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-earth-500 block">
                  Labour
                </span>
                <span className="text-lg font-bold text-earth-900">
                  {farmLabour.length} {farmLabour.length === 1 ? "worker" : "workers"}
                </span>
              </div>
            </div>
            <Link href={`/labour?farm_id=${farm.id}`}>
              <Badge variant="outline" size="sm" className="hover:bg-earth-100 cursor-pointer text-[10px]">
                Roster →
              </Badge>
            </Link>
          </div>
        </div>
      </div>

      {/* Field Plots Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-earth-900">
              Field Plots & Subdivisions ({fields.length})
            </h3>
            <p className="text-xs text-earth-500">
              Cultivated land zones with specific soil profiles and irrigation methods.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleOpenAddField}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Field Plot
          </Button>
        </div>

        {fields.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Field Plots Added Yet"
            description="Subdivide this farm into designated plots or zones for crop management, soil records, and automated irrigation scheduling."
            phaseBadge="Phase 5"
            actionLabel="Add First Field Plot"
            onAction={handleOpenAddField}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {fields.map((field) => (
              <FieldCard
                key={field.id}
                field={field}
                onEdit={handleOpenEditField}
                onDelete={handleOpenDeleteField}
              />
            ))}
          </div>
        )}
      </div>

      {/* Field Form Modal */}
      <FieldFormModal
        isOpen={isFieldModalOpen}
        farmId={farm.id}
        farmName={farm.name}
        defaultAreaUnit={farm.area_unit}
        fieldToEdit={fieldToEdit}
        onClose={() => setIsFieldModalOpen(false)}
        onSuccess={handleFieldSaveSuccess}
      />

      {/* Delete Field Dialog */}
      <DeleteFieldDialog
        isOpen={isDeleteFieldOpen}
        field={fieldToDelete}
        onClose={() => setIsDeleteFieldOpen(false)}
        onSuccess={handleFieldDeleteSuccess}
      />

      {/* Farm Edit Modal */}
      <FarmFormModal
        isOpen={isFarmModalOpen}
        farmToEdit={farm}
        onClose={() => setIsFarmModalOpen(false)}
        onSuccess={handleFarmUpdateSuccess}
      />

      {/* Delete Farm Dialog */}
      <DeleteFarmDialog
        isOpen={isDeleteFarmOpen}
        farm={farm}
        onClose={() => setIsDeleteFarmOpen(false)}
        onSuccess={handleFarmDeleteSuccess}
      />
    </DashboardLayout>
  );
}
