"use client";

import React, { useState, useEffect } from "react";
import { Farm, FarmCreatePayload, FarmUpdatePayload } from "@/types";
import { Modal, Input, Select, Button } from "@/components/ui";
import { farmsApi } from "@/lib/api/farms";
import { AlertCircle } from "lucide-react";

interface FarmFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedFarm: Farm) => void;
  farmToEdit?: Farm | null;
}

const AREA_UNIT_OPTIONS = [
  { value: "acres", label: "Acres (ac)" },
  { value: "hectares", label: "Hectares (ha)" },
  { value: "guntha", label: "Guntha (gta)" },
  { value: "bigha", label: "Bigha" },
  { value: "sq_ft", label: "Square Feet (sq ft)" },
  { value: "sq_m", label: "Square Meters (sq m)" },
];

export function FarmFormModal({
  isOpen,
  onClose,
  onSuccess,
  farmToEdit,
}: FarmFormModalProps) {
  const isEditing = Boolean(farmToEdit);

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [totalArea, setTotalArea] = useState<string>("");
  const [areaUnit, setAreaUnit] = useState("acres");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (farmToEdit) {
      setName(farmToEdit.name || "");
      setLocation(farmToEdit.location || "");
      setTotalArea(farmToEdit.total_area ? String(farmToEdit.total_area) : "");
      setAreaUnit(farmToEdit.area_unit || "acres");
    } else {
      setName("");
      setLocation("");
      setTotalArea("");
      setAreaUnit("acres");
    }
    setFieldErrors({});
    setServerError(null);
  }, [farmToEdit, isOpen]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Farm name is required";
    } else if (name.trim().length < 2) {
      errors.name = "Farm name must be at least 2 characters";
    }

    if (!location.trim()) {
      errors.location = "Location or address is required";
    } else if (location.trim().length < 2) {
      errors.location = "Location must be at least 2 characters";
    }

    const areaNum = parseFloat(totalArea);
    if (!totalArea || isNaN(areaNum)) {
      errors.totalArea = "Total area must be a valid number";
    } else if (areaNum <= 0) {
      errors.totalArea = "Total area must be greater than zero";
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
      const areaNum = parseFloat(totalArea);

      if (isEditing && farmToEdit) {
        const payload: FarmUpdatePayload = {
          name: name.trim(),
          location: location.trim(),
          total_area: areaNum,
          area_unit: areaUnit,
        };

        const res = await farmsApi.updateFarm(farmToEdit.id, payload);
        if (res.error) {
          setServerError(res.error);
        } else if (res.data) {
          onSuccess(res.data);
          onClose();
        }
      } else {
        const payload: FarmCreatePayload = {
          name: name.trim(),
          location: location.trim(),
          total_area: areaNum,
          area_unit: areaUnit,
        };

        const res = await farmsApi.createFarm(payload);
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
      title={isEditing ? "Edit Farm Landholding" : "Register New Farm Landholding"}
      description={
        isEditing
          ? "Update details, geographic location, and acreage measurement for this farm."
          : "Register a new agricultural holding to begin organizing field plots and crop rotations."
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
            form="farm-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            {isSubmitting
              ? isEditing
                ? "Saving Changes..."
                : "Registering Farm..."
              : isEditing
              ? "Save Changes"
              : "Register Farm"}
          </Button>
        </>
      }
    >
      <form id="farm-form" onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <Input
          label="Farm Name *"
          placeholder="e.g. Green Valley Farm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          disabled={isSubmitting}
          autoFocus
        />

        <Input
          label="Location / Village / District *"
          placeholder="e.g. Sector 4, Nashik, Maharashtra"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          error={fieldErrors.location}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Total Area *"
            type="number"
            step="0.01"
            min="0.01"
            placeholder="e.g. 25.5"
            value={totalArea}
            onChange={(e) => setTotalArea(e.target.value)}
            error={fieldErrors.totalArea}
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
      </form>
    </Modal>
  );
}
