"use client";

import React, { useState, useEffect } from "react";
import {
  AgriculturalApplication,
  ApplicationCategory,
  Farm,
  Field,
  Crop,
} from "@/types";
import { applicationsApi } from "@/lib/api/applications";
import { Modal, Button, Select } from "@/components/ui";
import {
  FlaskConical,
  Bug,
  AlertCircle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  MapPin,
  Wheat,
} from "lucide-react";

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  farms: Farm[];
  fields: Field[];
  crops: Crop[];
  editingApplication?: AgriculturalApplication | null;
  defaultCategory?: ApplicationCategory;
}

export function ApplicationFormModal({
  isOpen,
  onClose,
  onSuccess,
  farms,
  fields,
  crops,
  editingApplication,
  defaultCategory = "fertilizer",
}: ApplicationFormModalProps) {
  const [category, setCategory] = useState<ApplicationCategory>(defaultCategory);
  const [farmId, setFarmId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [cropId, setCropId] = useState("");
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("");
  const [quantity, setQuantity] = useState<number | string>("");
  const [unit, setUnit] = useState("kg");
  const [unitCost, setUnitCost] = useState<number | string>("");
  const [totalCost, setTotalCost] = useState<number | string>("");
  const [isManualTotalCost, setIsManualTotalCost] = useState(false);
  const [applicationDate, setApplicationDate] = useState("");
  const [applicationMethod, setApplicationMethod] = useState("foliar_spray");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize form state
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsManualTotalCost(false);

      if (editingApplication) {
        setCategory(editingApplication.application_category);
        setFarmId(editingApplication.farm_id);
        setFieldId(editingApplication.field_id);
        setCropId(editingApplication.crop_id || "");
        setProductName(editingApplication.product_name);
        setProductType(editingApplication.product_type);
        setQuantity(editingApplication.quantity);
        setUnit(editingApplication.unit);
        setUnitCost(editingApplication.unit_cost !== null && editingApplication.unit_cost !== undefined ? editingApplication.unit_cost : "");
        setTotalCost(editingApplication.total_cost !== null && editingApplication.total_cost !== undefined ? editingApplication.total_cost : "");
        setApplicationDate(editingApplication.application_date);
        setApplicationMethod(editingApplication.application_method || "foliar_spray");
        setPurpose(editingApplication.purpose || "");
        setNotes(editingApplication.notes || "");
      } else {
        const today = new Date().toISOString().split("T")[0];
        setCategory(defaultCategory);
        const initialFarm = farms.length > 0 ? farms[0].id : "";
        setFarmId(initialFarm);

        const availableFields = fields.filter((f) => f.farm_id === initialFarm);
        setFieldId(availableFields.length > 0 ? availableFields[0].id : "");
        setCropId("");
        setProductName("");
        setProductType(defaultCategory === "fertilizer" ? "organic" : "insecticide");
        setQuantity("");
        setUnit(defaultCategory === "fertilizer" ? "kg" : "L");
        setUnitCost("");
        setTotalCost("");
        setApplicationDate(today);
        setApplicationMethod(defaultCategory === "fertilizer" ? "broadcasting" : "foliar_spray");
        setPurpose("");
        setNotes("");
      }
    }
  }, [isOpen, editingApplication, defaultCategory, farms, fields]);

  // Handle cascaded fields when farm changes
  const handleFarmChange = (newFarmId: string) => {
    setFarmId(newFarmId);
    const relatedFields = fields.filter((f) => f.farm_id === newFarmId);
    const newFieldId = relatedFields.length > 0 ? relatedFields[0].id : "";
    setFieldId(newFieldId);
    setCropId("");
  };

  // Handle cascaded crops when field changes
  const handleFieldChange = (newFieldId: string) => {
    setFieldId(newFieldId);
    setCropId("");
  };

  // Live auto-calculation of total cost
  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    if (!isManualTotalCost && unitCost !== "") {
      const q = parseFloat(val) || 0;
      const uc = parseFloat(String(unitCost)) || 0;
      setTotalCost(q > 0 && uc > 0 ? (q * uc).toFixed(2) : "");
    }
  };

  const handleUnitCostChange = (val: string) => {
    setUnitCost(val);
    if (!isManualTotalCost) {
      const q = parseFloat(String(quantity)) || 0;
      const uc = parseFloat(val) || 0;
      setTotalCost(q > 0 && uc > 0 ? (q * uc).toFixed(2) : "");
    }
  };

  const handleTotalCostChange = (val: string) => {
    setTotalCost(val);
    setIsManualTotalCost(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId || !fieldId || !productName.trim() || !productType.trim() || !quantity || !unit || !applicationDate) {
      setErrorMsg("Please fill in all mandatory fields (Farm, Field, Product, Type, Quantity, Unit, Date).");
      return;
    }

    const numQty = parseFloat(String(quantity));
    if (isNaN(numQty) || numQty <= 0) {
      setErrorMsg("Quantity must be greater than zero.");
      return;
    }

    const numUnitCost = unitCost !== "" ? parseFloat(String(unitCost)) : undefined;
    const numTotalCost = totalCost !== "" ? parseFloat(String(totalCost)) : undefined;

    if (numUnitCost !== undefined && numUnitCost < 0) {
      setErrorMsg("Unit cost cannot be negative.");
      return;
    }
    if (numTotalCost !== undefined && numTotalCost < 0) {
      setErrorMsg("Total cost cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const payload = {
      farm_id: farmId,
      field_id: fieldId,
      crop_id: cropId || null,
      application_category: category,
      product_name: productName.trim(),
      product_type: productType.trim(),
      quantity: numQty,
      unit: unit.trim(),
      unit_cost: numUnitCost,
      total_cost: numTotalCost,
      application_date: applicationDate,
      application_method: applicationMethod || undefined,
      purpose: purpose.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    const res = editingApplication
      ? await applicationsApi.updateApplication(editingApplication.id, payload)
      : await applicationsApi.createApplication(payload);

    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      onSuccess();
      onClose();
    }
  };

  const availableFields = fields.filter((f) => f.farm_id === farmId);
  const availableCrops = crops.filter((c) => c.field_id === fieldId);

  const farmOptions = farms.map((f) => ({ value: f.id, label: f.name }));
  const fieldOptions = availableFields.map((f) => ({ value: f.id, label: f.name }));
  const cropOptions = [
    { value: "", label: "No Target Crop (Whole Plot)" },
    ...availableCrops.map((c) => ({ value: c.id, label: `${c.name} (${c.variety})` })),
  ];

  const fertilizerTypeOptions = [
    { value: "organic", label: "Organic Fertilizer" },
    { value: "compost", label: "Compost / Farmyard Manure (FYM)" },
    { value: "chemical", label: "Chemical / Synthetic Fertilizer (NPK/Urea/DAP)" },
    { value: "biofertilizer", label: "Biofertilizer (Rhizobium, PSB)" },
    { value: "micronutrient", label: "Micronutrients (Zinc, Boron, Ferrous)" },
    { value: "other", label: "Other Nutrient" },
  ];

  const pesticideTypeOptions = [
    { value: "insecticide", label: "Insecticide" },
    { value: "fungicide", label: "Fungicide" },
    { value: "herbicide", label: "Herbicide / Weedicide" },
    { value: "biological", label: "Biological / Botanical (Neem Oil, Bacillus)" },
    { value: "acaricide", label: "Acaricide / Miticide" },
    { value: "other", label: "Other Protection" },
  ];

  const unitOptions = [
    { value: "kg", label: "Kilograms (kg)" },
    { value: "g", label: "Grams (g)" },
    { value: "L", label: "Litres (L)" },
    { value: "ml", label: "Millilitres (ml)" },
    { value: "bags", label: "Bags (50kg)" },
    { value: "units", label: "Units / Packets" },
    { value: "tractor_trolley", label: "Tractor Trolley" },
  ];

  const methodOptions = [
    { value: "foliar_spray", label: "Foliar Spray" },
    { value: "drip_irrigation", label: "Drip Fertigation" },
    { value: "broadcasting", label: "Broadcasting / Soil Spread" },
    { value: "soil_incorporation", label: "Soil Incorporation / Tillage" },
    { value: "backpack_sprayer", label: "Backpack Knapsack Sprayer" },
    { value: "seed_treatment", label: "Seed Treatment" },
    { value: "other", label: "Other Application Method" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingApplication ? "Edit Agricultural Application" : "Log Agricultural Application"}
      description="Track nutrient dosing or pest protection chemicals, dosage metrics, and expenses."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Category Selector Tabs */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1.5">
            Application Category <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setCategory("fertilizer");
                setProductType("organic");
                setUnit("kg");
                setApplicationMethod("broadcasting");
              }}
              className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                category === "fertilizer"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs ring-2 ring-emerald-500/20"
                  : "bg-white border-earth-200 text-earth-600 hover:bg-earth-50"
              }`}
            >
              <FlaskConical className={`h-4 w-4 ${category === "fertilizer" ? "text-emerald-600" : "text-earth-400"}`} />
              Fertilizer / Nutrient
            </button>

            <button
              type="button"
              onClick={() => {
                setCategory("pesticide");
                setProductType("insecticide");
                setUnit("L");
                setApplicationMethod("foliar_spray");
              }}
              className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                category === "pesticide"
                  ? "bg-amber-50 border-amber-500 text-amber-900 shadow-2xs ring-2 ring-amber-500/20"
                  : "bg-white border-earth-200 text-earth-600 hover:bg-earth-50"
              }`}
            >
              <Bug className={`h-4 w-4 ${category === "pesticide" ? "text-amber-600" : "text-earth-400"}`} />
              Pesticide / Crop Protection
            </button>
          </div>
        </div>

        {/* Location Cascade: Farm, Field, Crop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-earth-50/80 rounded-xl border border-earth-200">
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Farm Estate <span className="text-red-500">*</span>
            </label>
            <Select
              options={farmOptions}
              value={farmId}
              onChange={(e) => handleFarmChange(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Field Plot <span className="text-red-500">*</span>
            </label>
            <Select
              options={fieldOptions}
              value={fieldId}
              onChange={(e) => handleFieldChange(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Target Crop (Optional)
            </label>
            <Select
              options={cropOptions}
              value={cropId}
              onChange={(e) => setCropId(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Product Details: Name, Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={category === "fertilizer" ? "e.g. Urea 46%, DAP, Compost" : "e.g. Neem Oil, Chlorpyrifos"}
              required
              className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Product Classification <span className="text-red-500">*</span>
            </label>
            <Select
              options={category === "fertilizer" ? fertilizerTypeOptions : pesticideTypeOptions}
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="text-xs"
              required
            />
          </div>
        </div>

        {/* Dosage & Pricing: Quantity, Unit, Unit Cost, Total Cost */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white rounded-xl border border-earth-200">
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Quantity Applied <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="0.00"
              required
              className="block w-full rounded-lg border border-earth-300 px-3 py-1.5 text-xs text-earth-900 font-semibold shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Unit <span className="text-red-500">*</span>
            </label>
            <Select
              options={unitOptions}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Unit Cost (₹)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-xs text-earth-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => handleUnitCostChange(e.target.value)}
                placeholder="0.00"
                className="block w-full rounded-lg border border-earth-300 pl-6 pr-2 py-1.5 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
              />
            </div>
            <span className="text-[10px] text-earth-400">per {unit}</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Total Cost (₹)
            </label>
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-xs text-earth-400">₹</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={totalCost}
                onChange={(e) => handleTotalCostChange(e.target.value)}
                placeholder="0.00"
                className="block w-full rounded-lg border border-earth-300 pl-6 pr-2 py-1.5 text-xs text-earth-900 font-bold shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
              />
            </div>
            <span className="text-[10px] text-earth-400">
              {isManualTotalCost ? "Manual entry" : "Auto-computed"}
            </span>
          </div>
        </div>

        {/* Date, Method, Purpose */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Application Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={applicationDate}
              onChange={(e) => setApplicationDate(e.target.value)}
              required
              className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Method of Application
            </label>
            <Select
              options={methodOptions}
              value={applicationMethod}
              onChange={(e) => setApplicationMethod(e.target.value)}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Target Purpose / Pest
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder={category === "fertilizer" ? "e.g. Basal vegetative growth" : "e.g. Bollworm, Aphid control"}
              className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">
            Notes / Safety Precautions (Optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Withholding period: 7 days. Protective gloves and mask worn during spray."
            className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-earth-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={isSubmitting}
            className="bg-farm-600 hover:bg-farm-700 text-white font-semibold flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-4 w-4" />
            {isSubmitting ? "Saving..." : editingApplication ? "Update Record" : "Save Application"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
