"use client";

import React, { useState, useEffect } from "react";
import { Field, FieldCreatePayload, FieldUpdatePayload } from "@/types";
import { Modal, Input, Select, Button } from "@/components/ui";
import { fieldsApi } from "@/lib/api/fields";
import { AlertCircle } from "lucide-react";

interface FieldFormModalProps {
  isOpen: boolean;
  farmId: string;
  farmName?: string;
  defaultAreaUnit?: string;
  fieldToEdit?: Field | null;
  onClose: () => void;
  onSuccess: (savedField: Field) => void;
}

const AREA_UNIT_OPTIONS = [
  { value: "acres", label: "Acres (ac)" },
  { value: "hectares", label: "Hectares (ha)" },
  { value: "guntha", label: "Guntha (gta)" },
  { value: "bigha", label: "Bigha" },
  { value: "sq_ft", label: "Square Feet (sq ft)" },
  { value: "sq_m", label: "Square Meters (sq m)" },
];

const SOIL_TYPE_OPTIONS = [
  { value: "Black Soil (Regur/Kali Mitti)", label: "Black Soil (Regur / Kali Mitti)" },
  { value: "Red & Yellow Soil", label: "Red & Yellow Soil" },
  { value: "Alluvial Soil (Jallodh)", label: "Alluvial Soil (Jallodh)" },
  { value: "Clay Loam", label: "Clay Loam" },
  { value: "Sandy Loam", label: "Sandy Loam" },
  { value: "Silt Loam", label: "Silt Loam" },
  { value: "Laterite Soil", label: "Laterite Soil" },
  { value: "Saline / Alkaline Soil", label: "Saline / Alkaline Soil" },
];

const IRRIGATION_OPTIONS = [
  { value: "Drip Irrigation", label: "Drip Irrigation (Micro-irrigation)" },
  { value: "Sprinkler System", label: "Sprinkler System" },
  { value: "Canal / Flood", label: "Canal / Flood Irrigation" },
  { value: "Borewell / Tube Well", label: "Borewell / Tube Well" },
  { value: "Open Dug Well", label: "Open Dug Well" },
  { value: "Rainfed (Natural Precipitation)", label: "Rainfed (Natural Precipitation)" },
  { value: "Furrow Irrigation", label: "Furrow Irrigation" },
];

export function FieldFormModal({
  isOpen,
  farmId,
  farmName,
  defaultAreaUnit = "acres",
  fieldToEdit,
  onClose,
  onSuccess,
}: FieldFormModalProps) {
  const isEditing = Boolean(fieldToEdit);

  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [areaUnit, setAreaUnit] = useState(defaultAreaUnit);
  const [soilType, setSoilType] = useState("");
  const [irrigationType, setIrrigationType] = useState("");
  const [description, setDescription] = useState("");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (fieldToEdit) {
      setName(fieldToEdit.name || "");
      setArea(fieldToEdit.area ? String(fieldToEdit.area) : "");
      setAreaUnit(fieldToEdit.area_unit || defaultAreaUnit);
      setSoilType(fieldToEdit.soil_type || "");
      setIrrigationType(fieldToEdit.irrigation_type || "");
      setDescription(fieldToEdit.description || "");
    } else {
      setName("");
      setArea("");
      setAreaUnit(defaultAreaUnit);
      setSoilType("");
      setIrrigationType("");
      setDescription("");
    }
    setFieldErrors({});
    setServerError(null);
  }, [fieldToEdit, isOpen, defaultAreaUnit]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Field name is required";
    }

    const areaNum = parseFloat(area);
    if (!area || isNaN(areaNum)) {
      errors.area = "Area must be a valid number";
    } else if (areaNum <= 0) {
      errors.area = "Area must be greater than zero";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const areaNum = parseFloat(area);

      if (isEditing && fieldToEdit) {
        const payload: FieldUpdatePayload = {
          name: name.trim(),
          area: areaNum,
          area_unit: areaUnit,
          soil_type: soilType || undefined,
          irrigation_type: irrigationType || undefined,
          description: description.trim() || undefined,
        };

        const res = await fieldsApi.updateField(fieldToEdit.id, payload);
        if (res.error) {
          setServerError(res.error);
        } else if (res.data) {
          onSuccess(res.data);
          onClose();
        }
      } else {
        const payload: FieldCreatePayload = {
          name: name.trim(),
          area: areaNum,
          area_unit: areaUnit,
          soil_type: soilType || undefined,
          irrigation_type: irrigationType || undefined,
          description: description.trim() || undefined,
        };

        const res = await fieldsApi.createField(farmId, payload);
        if (res.error) {
          setServerError(res.error);
        } else if (res.data) {
          onSuccess(res.data);
          onClose();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while saving.";
      setServerError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={isEditing ? "Edit Field Plot" : "Add Field Plot"}
      description={
        farmName
          ? `Subdivide and record spatial plot parameters for "${farmName}".`
          : "Configure plot boundaries, soil characteristics, and irrigation method."
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="field-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            {isSubmitting
              ? isEditing
                ? "Saving Changes..."
                : "Adding Plot..."
              : isEditing
              ? "Save Changes"
              : "Save Field Plot"}
          </Button>
        </>
      }
    >
      <form id="field-form" onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <Input
          label="Field / Plot Name *"
          placeholder="e.g. North Plot or Sugarcane Block A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          disabled={isSubmitting}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Plot Area *"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 10.5"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            error={fieldErrors.area}
            disabled={isSubmitting}
          />

          <Select
            label="Area Unit *"
            value={areaUnit}
            onChange={(e) => setAreaUnit(e.target.value)}
            options={AREA_UNIT_OPTIONS}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Soil Classification (Optional)"
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            options={SOIL_TYPE_OPTIONS}
            placeholder="Select soil profile"
            disabled={isSubmitting}
          />

          <Select
            label="Irrigation Method (Optional)"
            value={irrigationType}
            onChange={(e) => setIrrigationType(e.target.value)}
            options={IRRIGATION_OPTIONS}
            placeholder="Select irrigation method"
            disabled={isSubmitting}
          />
        </div>

        <div className="w-full space-y-1.5">
          <label className="block text-xs font-medium text-earth-700">
            Plot Description / Soil Notes (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="e.g. High organic matter, leveled in 2025, optimal for legume rotation"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            className="block w-full rounded-lg border border-earth-300 bg-white px-3 py-2 text-sm text-earth-900 transition-colors placeholder:text-earth-400 focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20 disabled:cursor-not-allowed disabled:bg-earth-100 disabled:text-earth-400"
          />
        </div>
      </form>
    </Modal>
  );
}
