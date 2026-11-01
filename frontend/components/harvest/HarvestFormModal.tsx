import React, { useState, useEffect } from "react";
import { Modal, Button, Input, Select } from "@/components/ui";
import { Farm, Field, Crop, Harvest, HarvestFormData } from "@/types";
import { Wheat, AlertCircle, Loader2 } from "lucide-react";

interface HarvestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: HarvestFormData) => Promise<void>;
  harvestToEdit?: Harvest | null;
  farms: Farm[];
  fields: Field[];
  crops: Crop[];
}

export function HarvestFormModal({
  isOpen,
  onClose,
  onSubmit,
  harvestToEdit,
  farms,
  fields,
  crops,
}: HarvestFormModalProps) {
  const isEditing = Boolean(harvestToEdit);

  // Form State
  const [farmId, setFarmId] = useState<string>("");
  const [fieldId, setFieldId] = useState<string>("");
  const [cropId, setCropId] = useState<string>("");
  const [harvestDate, setHarvestDate] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>("kg");
  const [qualityGrade, setQualityGrade] = useState<string>("Grade A");
  const [harvestMethod, setHarvestMethod] = useState<string>("Machine");
  const [storageLocation, setStorageLocation] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Prepopulate form on open or when harvestToEdit changes
  useEffect(() => {
    if (harvestToEdit) {
      setFarmId(harvestToEdit.farm_id || "");
      setFieldId(harvestToEdit.field_id || "");
      setCropId(harvestToEdit.crop_id || "");
      setHarvestDate(harvestToEdit.harvest_date || "");
      setQuantity(String(harvestToEdit.quantity || ""));
      setUnit(harvestToEdit.unit || "kg");
      setQualityGrade(harvestToEdit.quality_grade || "Grade A");
      setHarvestMethod(harvestToEdit.harvest_method || "Machine");
      setStorageLocation(harvestToEdit.storage_location || "");
      setBatchNumber(harvestToEdit.batch_number || "");
      setNotes(harvestToEdit.notes || "");
    } else {
      // Default new harvest form
      const defaultFarm = farms[0]?.id || "";
      const defaultField = fields.find((f) => f.farm_id === defaultFarm)?.id || fields[0]?.id || "";
      const defaultCrop = crops.find((c) => c.field_id === defaultField)?.id || crops[0]?.id || "";

      setFarmId(defaultFarm);
      setFieldId(defaultField);
      setCropId(defaultCrop);
      setHarvestDate(new Date().toISOString().split("T")[0]);
      setQuantity("");
      setUnit("kg");
      setQualityGrade("Grade A");
      setHarvestMethod("Machine");
      setStorageLocation("");
      setBatchNumber("");
      setNotes("");
    }
    setErrorMessage(null);
  }, [harvestToEdit, isOpen, farms, fields, crops]);

  // Cascading fields: Filter fields based on selected farm
  const availableFields = farmId ? fields.filter((f) => f.farm_id === farmId) : fields;

  // Cascading crops: Filter crops based on selected field or farm
  const availableCrops = crops.filter((c) => {
    if (fieldId) return c.field_id === fieldId;
    if (farmId) {
      const fieldIds = new Set(fields.filter((f) => f.farm_id === farmId).map((f) => f.id));
      return fieldIds.has(c.field_id);
    }
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!cropId) {
      setErrorMessage("Please select a target crop cycle.");
      return;
    }
    if (!harvestDate) {
      setErrorMessage("Please enter a valid harvest date.");
      return;
    }
    const numQty = parseFloat(quantity);
    if (isNaN(numQty) || numQty <= 0) {
      setErrorMessage("Quantity must be a positive number greater than 0.");
      return;
    }
    if (!unit.trim()) {
      setErrorMessage("Measurement unit is required.");
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        farm_id: farmId || undefined,
        field_id: fieldId || undefined,
        crop_id: cropId,
        harvest_date: harvestDate,
        quantity: numQty,
        unit: unit.trim().toLowerCase(),
        quality_grade: qualityGrade || undefined,
        harvest_method: harvestMethod || undefined,
        storage_location: storageLocation.trim() || undefined,
        batch_number: batchNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save harvest record. Please check parameters.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Harvest Record" : "Record Crop Harvest"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Cascading Hierarchy: Farm -> Field -> Crop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
              Farm Estate
            </label>
            <Select
              value={farmId}
              onChange={(e) => {
                const newFarmId = e.target.value;
                setFarmId(newFarmId);
                // Reset child field and crop if not matching
                const newFields = fields.filter((f) => f.farm_id === newFarmId);
                const nextFieldId = newFields[0]?.id || "";
                setFieldId(nextFieldId);
                const nextCrops = crops.filter((c) => c.field_id === nextFieldId);
                setCropId(nextCrops[0]?.id || "");
              }}
            >
              <option value="">Select Farm...</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
              Field Plot
            </label>
            <Select
              value={fieldId}
              onChange={(e) => {
                const newFieldId = e.target.value;
                setFieldId(newFieldId);
                const nextCrops = crops.filter((c) => c.field_id === newFieldId);
                setCropId(nextCrops[0]?.id || "");
              }}
            >
              <option value="">Select Field...</option>
              {availableFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
              Target Crop <span className="text-rose-500">*</span>
            </label>
            <Select
              value={cropId}
              onChange={(e) => setCropId(e.target.value)}
              required
            >
              <option value="">Select Crop...</option>
              {availableCrops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.variety})
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* 2. Harvest Date & Yield Quantity + Unit */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
              Harvest Date <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
              Yield Quantity <span className="text-rose-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 2500"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
              Unit <span className="text-rose-500">*</span>
            </label>
            <Select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="quintals">Quintals</option>
              <option value="tonnes">Tonnes</option>
              <option value="grams">Grams</option>
              <option value="bags">Bags</option>
              <option value="crates">Crates</option>
              <option value="pieces">Pieces</option>
              <option value="other">Other</option>
            </Select>
          </div>
        </div>

        {/* 3. Quality Grade & Harvest Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
              Quality Grade
            </label>
            <Select
              value={qualityGrade}
              onChange={(e) => setQualityGrade(e.target.value)}
            >
              <option value="Grade A">Grade A / Premium</option>
              <option value="Grade B">Grade B</option>
              <option value="Grade C">Grade C</option>
              <option value="Standard">Standard</option>
              <option value="Rejected">Rejected</option>
              <option value="Not specified">Not specified</option>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
              Harvest Method
            </label>
            <Select
              value={harvestMethod}
              onChange={(e) => setHarvestMethod(e.target.value)}
            >
              <option value="Machine">Machine / Harvester</option>
              <option value="Manual">Manual Hand-Harvesting</option>
              <option value="Combined">Combined (Manual + Machine)</option>
              <option value="Other">Other</option>
            </Select>
          </div>
        </div>

        {/* 4. Storage Location & Batch Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
              Storage Location
            </label>
            <Input
              placeholder="e.g. Grain Bin 2, Cold Storage Room B"
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
              Batch or Lot Number
            </label>
            <Input
              placeholder="e.g. WHEAT-2027-LOT1"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
            />
          </div>
        </div>

        {/* 5. Notes */}
        <div>
          <label className="block text-xs font-semibold text-earth-700 uppercase tracking-wider mb-1">
            Notes & Observations
          </label>
          <textarea
            rows={3}
            placeholder="Agronomic conditions, moisture content, grain quality notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-sm rounded-lg border border-earth-300 p-2.5 focus:border-farm-500 focus:ring-1 focus:ring-farm-500 outline-hidden"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-earth-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="bg-farm-600 hover:bg-farm-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Update Harvest"
            ) : (
              "Save Harvest Record"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
