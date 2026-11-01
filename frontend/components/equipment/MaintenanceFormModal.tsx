import React, { useState, useEffect } from "react";
import {
  Equipment,
  EquipmentMaintenance,
  EquipmentMaintenanceCreatePayload,
  EquipmentMaintenanceUpdatePayload,
  MaintenanceType,
  EquipmentStatus,
} from "@/types";
import { Modal, Button } from "@/components/ui";
import { Wrench, Calendar, IndianRupee, Clock, AlertCircle } from "lucide-react";

interface MaintenanceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    payload: EquipmentMaintenanceCreatePayload | EquipmentMaintenanceUpdatePayload
  ) => Promise<void>;
  equipment: Equipment | null;
  record?: EquipmentMaintenance | null;
  isLoading?: boolean;
}

const MAINTENANCE_TYPES: { id: MaintenanceType; label: string }[] = [
  { id: "routine_service", label: "Routine Service (Oil, Filters, Greasing)" },
  { id: "preventive_maintenance", label: "Preventive Maintenance / Seasonal Tune-up" },
  { id: "repair", label: "Repair / Breakdown Fix" },
  { id: "inspection", label: "Inspection / Diagnostic Check" },
  { id: "parts_replacement", label: "Parts Replacement" },
  { id: "other", label: "Other" },
];

export function MaintenanceFormModal({
  isOpen,
  onClose,
  onSubmit,
  equipment,
  record,
  isLoading = false,
}: MaintenanceFormModalProps) {
  const isEditing = Boolean(record);

  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>("routine_service");
  const [serviceDate, setServiceDate] = useState("");
  const [description, setDescription] = useState("");
  const [serviceProvider, setServiceProvider] = useState("");
  const [partsReplaced, setPartsReplaced] = useState("");
  const [cost, setCost] = useState("");
  const [downtimeMinutes, setDowntimeMinutes] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [updateEquipmentStatus, setUpdateEquipmentStatus] = useState<string>("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (record) {
      setMaintenanceType((record.maintenance_type as MaintenanceType) || "routine_service");
      setServiceDate(record.service_date || "");
      setDescription(record.description || "");
      setServiceProvider(record.service_provider || "");
      setPartsReplaced(record.parts_replaced || "");
      setCost(
        record.cost !== null && record.cost !== undefined ? String(record.cost) : ""
      );
      setDowntimeMinutes(
        record.downtime_minutes !== null && record.downtime_minutes !== undefined
          ? String(record.downtime_minutes)
          : ""
      );
      setNextServiceDate(record.next_service_date || "");
      setUpdateEquipmentStatus("");
      setNotes(record.notes || "");
    } else {
      const todayStr = new Date().toISOString().split("T")[0];
      setMaintenanceType("routine_service");
      setServiceDate(todayStr);
      setDescription("");
      setServiceProvider("");
      setPartsReplaced("");
      setCost("");
      setDowntimeMinutes("");
      setNextServiceDate("");
      setUpdateEquipmentStatus("available");
      setNotes("");
    }
    setErrors({});
  }, [record, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!serviceDate) {
      errs.serviceDate = "Service date is required.";
    }
    if (!description.trim()) {
      errs.description = "Please describe the maintenance or repairs performed.";
    }
    if (cost.trim() !== "") {
      const cVal = parseFloat(cost);
      if (isNaN(cVal) || cVal < 0) {
        errs.cost = "Cost must be a non-negative number.";
      }
    }
    if (downtimeMinutes.trim() !== "") {
      const dtVal = parseInt(downtimeMinutes, 10);
      if (isNaN(dtVal) || dtVal < 0) {
        errs.downtimeMinutes = "Downtime must be a non-negative number of minutes.";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: EquipmentMaintenanceCreatePayload = {
      maintenance_type: maintenanceType,
      service_date: serviceDate,
      description: description.trim(),
      service_provider: serviceProvider.trim() || null,
      parts_replaced: partsReplaced.trim() || null,
      cost: cost.trim() !== "" ? parseFloat(cost) : null,
      downtime_minutes: downtimeMinutes.trim() !== "" ? parseInt(downtimeMinutes, 10) : null,
      next_service_date: nextServiceDate || null,
      update_equipment_status: updateEquipmentStatus ? (updateEquipmentStatus as EquipmentStatus) : null,
      notes: notes.trim() || null,
    };

    await onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Service Record" : "Log Equipment Maintenance / Repair"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {equipment && (
          <div className="bg-earth-50 p-3 rounded-lg border border-earth-200 text-xs flex items-center justify-between">
            <div>
              <span className="text-earth-500 font-medium">Machine:</span>{" "}
              <strong className="text-earth-900 font-semibold">{equipment.equipment_name}</strong>
              {equipment.brand && <span className="text-earth-600"> ({equipment.brand})</span>}
            </div>
            <span className="px-2 py-0.5 bg-earth-200 text-earth-800 rounded font-medium">
              {equipment.equipment_type}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Service Date */}
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Service Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className={`w-full px-3 py-2 text-sm bg-earth-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white text-earth-900 ${
                errors.serviceDate
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-earth-200 focus:ring-farm-500"
              }`}
            />
            {errors.serviceDate && (
              <p className="mt-1 text-xs text-rose-500">{errors.serviceDate}</p>
            )}
          </div>

          {/* Maintenance Type */}
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Maintenance Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value as MaintenanceType)}
              className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
            >
              {MAINTENANCE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-earth-700 mb-1">
            Service Description & Tasks Conducted <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Changed engine oil, replaced fuel and hydraulic filters, greased all implement fittings, checked tire pressures..."
            className={`w-full px-3 py-2 text-sm bg-earth-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white text-earth-900 ${
              errors.description
                ? "border-rose-400 focus:ring-rose-400"
                : "border-earth-200 focus:ring-farm-500"
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-xs text-rose-500">{errors.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Service Provider */}
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Service Provider / Mechanic / Workshop
            </label>
            <input
              type="text"
              value={serviceProvider}
              onChange={(e) => setServiceProvider(e.target.value)}
              placeholder="e.g., Authorized Dealership / Kailash Mechanic"
              className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
            />
          </div>

          {/* Parts Replaced */}
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Parts Replaced (Optional)
            </label>
            <input
              type="text"
              value={partsReplaced}
              onChange={(e) => setPartsReplaced(e.target.value)}
              placeholder="e.g., 15W40 Oil (8.5L), Oil Filter, V-Belt"
              className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Service Cost */}
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Cost (₹ INR)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              className={`w-full px-3 py-2 text-sm bg-earth-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white text-earth-900 ${
                errors.cost
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-earth-200 focus:ring-farm-500"
              }`}
            />
            {errors.cost && (
              <p className="mt-1 text-xs text-rose-500">{errors.cost}</p>
            )}
          </div>

          {/* Downtime Minutes */}
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Downtime (Minutes)
            </label>
            <input
              type="number"
              min="0"
              value={downtimeMinutes}
              onChange={(e) => setDowntimeMinutes(e.target.value)}
              placeholder="e.g., 120 (2 hours)"
              className={`w-full px-3 py-2 text-sm bg-earth-50 border rounded-lg focus:outline-none focus:ring-2 focus:bg-white text-earth-900 ${
                errors.downtimeMinutes
                  ? "border-rose-400 focus:ring-rose-400"
                  : "border-earth-200 focus:ring-farm-500"
              }`}
            />
            {errors.downtimeMinutes && (
              <p className="mt-1 text-xs text-rose-500">{errors.downtimeMinutes}</p>
            )}
          </div>

          {/* Next Service Date */}
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Next Service Date
            </label>
            <input
              type="date"
              value={nextServiceDate}
              onChange={(e) => setNextServiceDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
            />
          </div>
        </div>

        {/* Update Equipment Status Dropdown */}
        {!isEditing && (
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Set Operational Status After Service
            </label>
            <select
              value={updateEquipmentStatus}
              onChange={(e) => setUpdateEquipmentStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
            >
              <option value="">Keep Current Status ({equipment?.operational_status})</option>
              <option value="available">Set to Available (Ready for Deployment)</option>
              <option value="in_use">Set to In Use (Active in Field)</option>
              <option value="under_maintenance">Set to Under Maintenance (Still undergoing repairs)</option>
              <option value="retired">Set to Retired</option>
            </select>
          </div>
        )}

        {/* Technician Remarks */}
        <div>
          <label className="block text-xs font-semibold text-earth-700 mb-1">
            Technician Notes & Recommendations
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Recommend replacing front tires before upcoming monsoon tillage."
            className="w-full px-3 py-2 text-sm bg-earth-50 border border-earth-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-farm-500 focus:bg-white text-earth-900"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-earth-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? "Saving..." : isEditing ? "Update Service Log" : "Record Maintenance"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
