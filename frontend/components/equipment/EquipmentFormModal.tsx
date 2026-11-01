import React, { useState, useEffect } from "react";
import {
  Equipment,
  EquipmentCreatePayload,
  EquipmentUpdatePayload,
  EquipmentCondition,
  EquipmentStatus,
  Farm,
  Field,
} from "@/types";
import { Modal, Button, Input } from "@/components/ui";
import { Wrench, AlertCircle } from "lucide-react";

interface EquipmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: EquipmentCreatePayload | EquipmentUpdatePayload) => Promise<void>;
  equipment?: Equipment | null;
  farms: Farm[];
  fields: Field[];
  isLoading?: boolean;
}

const PREDEFINED_TYPES = [
  "Tractor",
  "Cultivator",
  "Plough",
  "Harvester",
  "Seed Drill",
  "Sprayer",
  "Water Pump",
  "Drip Irrigation Equipment",
  "Sprinkler System",
  "Power Tiller",
  "Trailer",
  "Other",
];

const FUEL_TYPES = ["Diesel", "Petrol", "Electric", "Solar", "Manual", "Other"];

export function EquipmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  equipment,
  farms,
  fields,
  isLoading = false,
}: EquipmentFormModalProps) {
  const isEditing = Boolean(equipment);

  const [farmId, setFarmId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [equipmentName, setEquipmentName] = useState("");
  const [equipmentType, setEquipmentType] = useState("Tractor");
  const [customType, setCustomType] = useState("");
  const [brand, setBrand] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [identificationNumber, setIdentificationNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [condition, setCondition] = useState<EquipmentCondition>("good");
  const [operationalStatus, setOperationalStatus] = useState<EquipmentStatus>("available");
  const [fuelType, setFuelType] = useState("");
  const [warrantyExpiryDate, setWarrantyExpiryDate] = useState("");
  const [lastServiceDate, setLastServiceDate] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (equipment) {
      setFarmId(equipment.farm_id || "");
      setFieldId(equipment.field_id || "");
      setEquipmentName(equipment.equipment_name || "");

      if (PREDEFINED_TYPES.includes(equipment.equipment_type)) {
        setEquipmentType(equipment.equipment_type);
        setCustomType("");
      } else {
        setEquipmentType("Other");
        setCustomType(equipment.equipment_type);
      }

      setBrand(equipment.brand || "");
      setModelNumber(equipment.model_number || "");
      setSerialNumber(equipment.serial_number || "");
      setIdentificationNumber(equipment.identification_number || "");
      setQuantity(equipment.quantity ? String(equipment.quantity) : "1");
      setPurchaseDate(equipment.purchase_date || "");
      setPurchasePrice(
        equipment.purchase_price !== null && equipment.purchase_price !== undefined
          ? String(equipment.purchase_price)
          : ""
      );
      setSupplierName(equipment.supplier_name || "");
      setCondition(equipment.condition || "good");
      setOperationalStatus(equipment.operational_status || "available");
      setFuelType(equipment.fuel_type || "");
      setWarrantyExpiryDate(equipment.warranty_expiry_date || "");
      setLastServiceDate(equipment.last_service_date || "");
      setNextServiceDate(equipment.next_service_date || "");
      setNotes(equipment.notes || "");
    } else {
      // Defaults for new equipment
      setFarmId(farms.length > 0 ? farms[0].id : "");
      setFieldId("");
      setEquipmentName("");
      setEquipmentType("Tractor");
      setCustomType("");
      setBrand("");
      setModelNumber("");
      setSerialNumber("");
      setIdentificationNumber("");
      setQuantity("1");
      setPurchaseDate("");
      setPurchasePrice("");
      setSupplierName("");
      setCondition("good");
      setOperationalStatus("available");
      setFuelType("Diesel");
      setWarrantyExpiryDate("");
      setLastServiceDate("");
      setNextServiceDate("");
      setNotes("");
    }
    setErrors({});
  }, [equipment, farms, isOpen]);

  const availableFields = farmId
    ? fields.filter((f) => f.farm_id === farmId)
    : fields;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!farmId) {
      errs.farmId = "Please select a farm estate.";
    }
    if (!equipmentName.trim()) {
      errs.equipmentName = "Equipment name is required.";
    }
    if (equipmentType === "Other" && !customType.trim()) {
      errs.equipmentType = "Please specify the custom equipment category.";
    }
    const qVal = parseInt(quantity, 10);
    if (isNaN(qVal) || qVal <= 0) {
      errs.quantity = "Quantity must be an integer greater than 0.";
    }
    if (purchasePrice.trim() !== "") {
      const pVal = parseFloat(purchasePrice);
      if (isNaN(pVal) || pVal < 0) {
        errs.purchasePrice = "Purchase price must be a non-negative number.";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalType = equipmentType === "Other" ? customType.trim() : equipmentType;
    const finalPrice =
      purchasePrice.trim() !== "" ? parseFloat(purchasePrice) : null;

    const payload: EquipmentCreatePayload = {
      farm_id: farmId,
      field_id: fieldId || null,
      equipment_name: equipmentName.trim(),
      equipment_type: finalType,
      brand: brand.trim() || null,
      model_number: modelNumber.trim() || null,
      serial_number: serialNumber.trim() || null,
      identification_number: identificationNumber.trim() || null,
      quantity: parseInt(quantity, 10) || 1,
      purchase_date: purchaseDate || null,
      purchase_price: finalPrice,
      supplier_name: supplierName.trim() || null,
      condition,
      operational_status: operationalStatus,
      fuel_type: fuelType.trim() || null,
      warranty_expiry_date: warrantyExpiryDate || null,
      last_service_date: lastServiceDate || null,
      next_service_date: nextServiceDate || null,
      notes: notes.trim() || null,
    };

    await onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Equipment Profile" : "Register Farm Equipment"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Identification & Classification */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500 mb-3 border-b border-earth-100 pb-1.5 flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-farm-600" />
            1. Equipment Identification & Classification
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Equipment Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Equipment Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                placeholder="e.g., Mahindra 575 DI XP Plus Tractor"
                className={`w-full px-3 py-2 text-sm bg-earth-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white text-earth-900 transition-all ${
                  errors.equipmentName
                    ? "border-rose-400 focus:ring-rose-400"
                    : "border-earth-200 focus:ring-farm-500"
                }`}
              />
              {errors.equipmentName && (
                <p className="mt-1 text-xs text-rose-500">{errors.equipmentName}</p>
              )}
            </div>

            {/* Equipment Type Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Equipment Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={equipmentType}
                onChange={(e) => setEquipmentType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
              >
                {PREDEFINED_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Type (if Other) */}
            {equipmentType === "Other" && (
              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Specify Category <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="e.g., Drone Sprayer, Grain Auger..."
                  className={`w-full px-3 py-2 text-sm bg-earth-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white text-earth-900 ${
                    errors.equipmentType
                      ? "border-rose-400 focus:ring-rose-400"
                      : "border-earth-200 focus:ring-farm-500"
                  }`}
                />
                {errors.equipmentType && (
                  <p className="mt-1 text-xs text-rose-500">{errors.equipmentType}</p>
                )}
              </div>
            )}

            {/* Brand / Make */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Brand / Manufacturer
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Mahindra, John Deere, Kirloskar"
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
              />
            </div>

            {/* Model Number */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Model Number / Version
              </label>
              <input
                type="text"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="e.g., 575 DI, HTP-50"
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
              />
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Serial Number (VIN / Chassis #)
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g., MAH-575-2024-9988"
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900 font-mono text-xs"
              />
            </div>

            {/* Identification / Tag Number */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Registration / Asset Tag Number
              </label>
              <input
                type="text"
                value={identificationNumber}
                onChange={(e) => setIdentificationNumber(e.target.value)}
                placeholder="e.g., MH-15-AG-4421, ASSET-042"
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* 2. Farm Assignment & Quantity */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500 mb-3 border-b border-earth-100 pb-1.5">
            2. Location & Fleet Quantity
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Farm Select */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Farm Estate <span className="text-rose-500">*</span>
              </label>
              <select
                value={farmId}
                onChange={(e) => {
                  setFarmId(e.target.value);
                  setFieldId("");
                }}
                className={`w-full px-3 py-2 text-sm bg-earth-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white text-earth-900 ${
                  errors.farmId
                    ? "border-rose-400 focus:ring-rose-400"
                    : "border-earth-200 focus:ring-farm-500"
                }`}
              >
                <option value="">Select Farm...</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
              {errors.farmId && (
                <p className="mt-1 text-xs text-rose-500">{errors.farmId}</p>
              )}
            </div>

            {/* Field Plot Select */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Assigned Field Plot (Optional)
              </label>
              <select
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                disabled={!farmId}
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900 disabled:opacity-50"
              >
                <option value="">All Farm / General Yard</option>
                {availableFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-earth-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white text-earth-900 ${
                  errors.quantity
                    ? "border-rose-400 focus:ring-rose-400"
                    : "border-earth-200 focus:ring-farm-500"
                }`}
              />
              {errors.quantity && (
                <p className="mt-1 text-xs text-rose-500">{errors.quantity}</p>
              )}
            </div>
          </div>
        </div>

        {/* 3. Operational Status & Health */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500 mb-3 border-b border-earth-100 pb-1.5">
            3. Operational Status & Energy
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Condition */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Physical Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as EquipmentCondition)}
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
              >
                <option value="excellent">Excellent (Like New)</option>
                <option value="good">Good (Fully Operational)</option>
                <option value="fair">Fair (Normal Wear)</option>
                <option value="poor">Poor (Needs Attention)</option>
                <option value="damaged">Damaged (Inoperable)</option>
              </select>
            </div>

            {/* Operational Status */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Operational Status
              </label>
              <select
                value={operationalStatus}
                onChange={(e) => setOperationalStatus(e.target.value as EquipmentStatus)}
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
              >
                <option value="available">Available (In Yard)</option>
                <option value="in_use">In Use (Active in Field)</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="retired">Retired / Decommissioned</option>
              </select>
            </div>

            {/* Fuel / Power Type */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Fuel / Power Source
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
              >
                <option value="">Select / Not Applicable</option>
                {FUEL_TYPES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4. Purchase & Financial Information */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500 mb-3 border-b border-earth-100 pb-1.5">
            4. Purchase & Financial Valuation
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Purchase Price */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Purchase Price (₹ INR)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="Leave blank if unknown"
                className={`w-full px-3 py-2 text-sm bg-earth-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white text-earth-900 ${
                  errors.purchasePrice
                    ? "border-rose-400 focus:ring-rose-400"
                    : "border-earth-200 focus:ring-farm-500"
                }`}
              />
              <p className="text-[11px] text-earth-400 mt-0.5">
                Confirmed ₹0 vs unknown price distinguished.
              </p>
              {errors.purchasePrice && (
                <p className="mt-1 text-xs text-rose-500">{errors.purchasePrice}</p>
              )}
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
              />
            </div>

            {/* Supplier / Dealer Name */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Supplier / Dealership
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g., Kisan Agro Machinery"
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
              />
            </div>
          </div>
        </div>

        {/* 5. Service & Warranty Schedule */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-earth-500 mb-3 border-b border-earth-100 pb-1.5">
            5. Service Schedules & Warranty
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Warranty Expiry */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Warranty Expiry Date
              </label>
              <input
                type="date"
                value={warrantyExpiryDate}
                onChange={(e) => setWarrantyExpiryDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
              />
            </div>

            {/* Last Service Date */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Last Service Conducted
              </label>
              <input
                type="date"
                value={lastServiceDate}
                onChange={(e) => setLastServiceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
              />
            </div>

            {/* Next Service Date */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Next Service Scheduled
              </label>
              <input
                type="date"
                value={nextServiceDate}
                onChange={(e) => setNextServiceDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
              />
            </div>
          </div>
        </div>

        {/* 6. Notes */}
        <div>
          <label className="block text-xs font-semibold text-earth-700 mb-1">
            Operational Notes & Specifications
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Technical specs, implement attachments, tyre specs, battery model..."
            className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
          />
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-earth-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : isEditing
              ? "Update Equipment"
              : "Register Equipment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
