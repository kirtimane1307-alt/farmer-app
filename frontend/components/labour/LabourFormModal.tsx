"use client";

import React, { useState, useEffect } from "react";
import { Farm, Labour, LabourCreatePayload, LabourUpdatePayload, LabourStatus } from "@/types";
import { Modal, Button, Input, Select } from "@/components/ui";
import { labourApi } from "@/lib/api/labour";
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  IndianRupee,
  Calendar,
  FileText,
  AlertCircle,
  Tractor,
} from "lucide-react";

interface LabourFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedLabour: Labour) => void;
  labourToEdit?: Labour | null;
  farms: Farm[];
  defaultFarmId?: string;
}

const WORK_TYPES = [
  "General Labour",
  "Tractor Operator",
  "Irrigation Worker",
  "Harvest Worker",
  "Field Worker",
  "Other",
];

export function LabourFormModal({
  isOpen,
  onClose,
  onSuccess,
  labourToEdit,
  farms,
  defaultFarmId,
}: LabourFormModalProps) {
  const isEditing = Boolean(labourToEdit);

  // Form states
  const [farmId, setFarmId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [workType, setWorkType] = useState("General Labour");
  const [dailyWage, setDailyWage] = useState<string>("500");
  const [joiningDate, setJoiningDate] = useState("");
  const [status, setStatus] = useState<LabourStatus>("active");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize or reset form values
  useEffect(() => {
    if (labourToEdit) {
      setFarmId(labourToEdit.farm_id);
      setName(labourToEdit.name);
      setPhone(labourToEdit.phone || "");
      setAddress(labourToEdit.address || "");
      setWorkType(labourToEdit.work_type || "General Labour");
      setDailyWage(String(labourToEdit.daily_wage));
      setJoiningDate(labourToEdit.joining_date);
      setStatus(labourToEdit.status);
      setNotes(labourToEdit.notes || "");
    } else {
      // Default to passed farm ID or first farm in user list
      const initialFarm = defaultFarmId || (farms.length > 0 ? farms[0].id : "");
      setFarmId(initialFarm);
      setName("");
      setPhone("");
      setAddress("");
      setWorkType("General Labour");
      setDailyWage("500");
      setJoiningDate(new Date().toISOString().split("T")[0]);
      setStatus("active");
      setNotes("");
    }
    setFormError(null);
  }, [labourToEdit, isOpen, farms, defaultFarmId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const cleanName = name.trim();
    if (!cleanName) {
      setFormError("Worker full name is required.");
      return;
    }

    if (!isEditing && !farmId) {
      setFormError("Please select a farm estate for this worker.");
      return;
    }

    const wageNum = parseFloat(dailyWage);
    if (isNaN(wageNum) || wageNum < 0) {
      setFormError("Daily wage must be a non-negative number.");
      return;
    }

    if (!joiningDate) {
      setFormError("Joining date is required.");
      return;
    }

    // Optional phone validation
    if (phone.trim()) {
      const digits = phone.replace(/[\s\-\(\)\+]/g, "");
      if (digits.length < 7 || digits.length > 15) {
        setFormError("Phone number must contain between 7 and 15 digits.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isEditing && labourToEdit) {
        const updatePayload: LabourUpdatePayload = {
          name: cleanName,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          work_type: workType.trim() || "General Labour",
          daily_wage: wageNum,
          joining_date: joiningDate,
          status,
          notes: notes.trim() || undefined,
        };

        const res = await labourApi.updateLabour(labourToEdit.id, updatePayload);
        if (res.error) {
          setFormError(res.error || "Failed to update worker profile.");
        } else if (res.data) {
          onSuccess(res.data);
          onClose();
        }
      } else {
        const createPayload: LabourCreatePayload = {
          farm_id: farmId,
          name: cleanName,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          work_type: workType.trim() || "General Labour",
          daily_wage: wageNum,
          joining_date: joiningDate,
          status,
          notes: notes.trim() || undefined,
        };

        const res = await labourApi.createLabour(createPayload, farmId);
        if (res.error) {
          setFormError(res.error || "Failed to create worker profile.");
        } else if (res.data) {
          onSuccess(res.data);
          onClose();
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      title={isEditing ? `Edit Worker: ${labourToEdit?.name}` : "Register New Farm Worker"}
      description={
        isEditing
          ? "Update contact information, trade role, wage agreements, or status."
          : "Add a farm worker with daily wage terms and assign them to an agricultural estate."
      }
      size="lg"
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
            form="labour-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
          >
            {isEditing ? "Save Changes" : "Register Worker"}
          </Button>
        </>
      }
    >
      <form id="labour-form" onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Farm Estate Selector */}
        {!isEditing ? (
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Assigned Farm Estate <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                required
                className="w-full text-sm rounded-lg border border-earth-300 bg-white px-3 py-2 text-earth-900 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
              >
                {farms.length === 0 ? (
                  <option value="" disabled>
                    No farms registered yet — please create a farm first
                  </option>
                ) : (
                  farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.location})
                    </option>
                  ))
                )}
              </select>
            </div>
            <p className="text-[11px] text-earth-500 mt-1">
              Select which of your agricultural estates this worker is assigned to.
            </p>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-earth-50 border border-earth-200 text-xs text-earth-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tractor className="h-4 w-4 text-earth-500" />
              <span>Assigned Estate: <strong>{labourToEdit?.farm_name || "Farm"}</strong></span>
            </div>
            <span className="text-[11px] text-earth-400">Fixed in Phase 7</span>
          </div>
        )}

        {/* Row 1: Name and Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Worker Full Name *"
            placeholder="e.g. Ramesh Patel"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            leftIcon={<User className="h-4 w-4 text-earth-400" />}
          />

          <Input
            label="Contact Phone"
            placeholder="e.g. +91 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="h-4 w-4 text-earth-400" />}
            helperText="Indian mobile format (+91 or 10 digits)"
          />
        </div>

        {/* Row 2: Work Type and Daily Wage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Work Trade / Role <span className="text-red-500">*</span>
            </label>
            <select
              value={workType}
              onChange={(e) => setWorkType(e.target.value)}
              className="w-full text-sm rounded-lg border border-earth-300 bg-white px-3 py-2 text-earth-900 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
            >
              {WORK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Daily Wage (₹) *"
            type="number"
            min="0"
            step="10"
            placeholder="e.g. 500"
            value={dailyWage}
            onChange={(e) => setDailyWage(e.target.value)}
            required
            leftIcon={<IndianRupee className="h-4 w-4 text-earth-400" />}
            helperText="Agreed normal compensation rate per work day"
          />
        </div>

        {/* Row 3: Joining Date and Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Employment Joining Date *"
            type="date"
            value={joiningDate}
            onChange={(e) => setJoiningDate(e.target.value)}
            required
            leftIcon={<Calendar className="h-4 w-4 text-earth-400" />}
          />

          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Employment Status <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as LabourStatus)}
              className="w-full text-sm rounded-lg border border-earth-300 bg-white px-3 py-2 text-earth-900 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
            >
              <option value="active">Active (Available for daily muster roll)</option>
              <option value="inactive">Inactive (On leave or unassigned)</option>
            </select>
          </div>
        </div>

        {/* Address */}
        <Input
          label="Residential / Village Address"
          placeholder="e.g. Village Rampur, Tehsil 2"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          leftIcon={<MapPin className="h-4 w-4 text-earth-400" />}
        />

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-earth-700 mb-1">
            Notes / Skills / Observations
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Certified in tractor operation, knows drip line fixing..."
            className="w-full text-xs rounded-lg border border-earth-300 bg-white p-2.5 text-earth-900 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600 resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}
