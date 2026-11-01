"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, AlertTriangle, Repeat, Tag, MapPin } from "lucide-react";
import {
  ReminderItem,
  ReminderCreateInput,
  ReminderUpdateInput,
  Farm,
  Field,
  NotificationCategory,
  NotificationPriority,
  ReminderRecurrence,
} from "@/types";
import { fieldsApi } from "@/lib/api/fields";

interface ReminderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReminderCreateInput | ReminderUpdateInput) => Promise<void>;
  reminder?: ReminderItem | null;
  farms: Farm[];
}

const CATEGORIES: { value: NotificationCategory; label: string }[] = [
  { value: "general", label: "General Task" },
  { value: "crop", label: "Crop Management" },
  { value: "irrigation", label: "Irrigation Schedule" },
  { value: "fertilizer_pesticide", label: "Fertilizer & Pesticide" },
  { value: "labour_attendance", label: "Labour & Attendance" },
  { value: "salary_payment", label: "Salary & Payment" },
  { value: "harvest", label: "Harvest Operation" },
  { value: "expense_finance", label: "Expense & Finance" },
  { value: "equipment_maintenance", label: "Machinery Maintenance" },
  { value: "calendar_event", label: "Farm Calendar" },
  { value: "custom_reminder", label: "Custom Reminder" },
];

const PRIORITIES: { value: NotificationPriority; label: string }[] = [
  { value: "low", label: "Low Priority" },
  { value: "medium", label: "Medium Priority" },
  { value: "high", label: "High Priority" },
  { value: "urgent", label: "Urgent" },
];

const RECURRENCES: { value: ReminderRecurrence; label: string }[] = [
  { value: "none", label: "No Recurrence (One-time)" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function ReminderFormModal({
  isOpen,
  onClose,
  onSubmit,
  reminder,
  farms,
}: ReminderFormModalProps) {
  const isEditing = Boolean(reminder);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [farmId, setFarmId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [category, setCategory] = useState<NotificationCategory>("general");
  const [priority, setPriority] = useState<NotificationPriority>("medium");
  const [reminderDatetime, setReminderDatetime] = useState("");
  const [recurrenceType, setRecurrenceType] = useState<ReminderRecurrence>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);

  const [availableFields, setAvailableFields] = useState<Field[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Populate form on edit
  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title || "");
      setDescription(reminder.description || "");
      setFarmId(reminder.farm_id || "");
      setFieldId(reminder.field_id || "");
      setCategory(reminder.category || "general");
      setPriority(reminder.priority || "medium");
      setRecurrenceType(reminder.recurrence_type || "none");
      setRecurrenceInterval(reminder.recurrence_interval || 1);

      if (reminder.reminder_datetime) {
        const d = new Date(reminder.reminder_datetime);
        // Format for datetime-local: YYYY-MM-DDTHH:mm
        const pad = (n: number) => String(n).padStart(2, "0");
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
          d.getHours()
        )}:${pad(d.getMinutes())}`;
        setReminderDatetime(formatted);
      }
    } else {
      // Default new reminder: tomorrow at 09:00 AM
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      tmrw.setHours(9, 0, 0, 0);
      const pad = (n: number) => String(n).padStart(2, "0");
      const formatted = `${tmrw.getFullYear()}-${pad(tmrw.getMonth() + 1)}-${pad(
        tmrw.getDate()
      )}T${pad(tmrw.getHours())}:${pad(tmrw.getMinutes())}`;

      setTitle("");
      setDescription("");
      setFarmId(farms.length > 0 ? farms[0].id : "");
      setFieldId("");
      setCategory("general");
      setPriority("medium");
      setReminderDatetime(formatted);
      setRecurrenceType("none");
      setRecurrenceInterval(1);
    }
    setErrorMessage("");
  }, [reminder, isOpen, farms]);

  // Load fields when selected farm changes
  useEffect(() => {
    if (farmId) {
      fieldsApi
        .getFieldsForFarm(farmId)
        .then((res) => {
          if (!res.error && res.data) {
            setAvailableFields(res.data);
          } else {
            setAvailableFields([]);
          }
        })
        .catch(() => setAvailableFields([]));
    } else {
      setAvailableFields([]);
    }
  }, [farmId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Please enter a reminder title.");
      return;
    }
    if (!reminderDatetime) {
      setErrorMessage("Please select a scheduled date and time.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const payload: ReminderCreateInput = {
        title: title.trim(),
        description: description.trim() || undefined,
        farm_id: farmId || undefined,
        field_id: fieldId || undefined,
        category,
        priority,
        reminder_datetime: new Date(reminderDatetime).toISOString(),
        recurrence_type: recurrenceType,
        recurrence_interval: recurrenceInterval,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save reminder.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-earth-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-earth-100 px-6 py-4 bg-earth-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-farm-100 text-farm-700">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-earth-900 text-base">
                {isEditing ? "Edit Farm Reminder" : "Create Farm Reminder"}
              </h3>
              <p className="text-xs text-earth-500">
                Configure schedule, recurrence, and operational context
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-earth-400 hover:text-earth-700 hover:bg-earth-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Reminder Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Apply bio-pesticide in Field 2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-earth-200 text-xs focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="Operational details, dosages, or assigned workers..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-earth-200 text-xs focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
          </div>

          {/* Farm & Field Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-earth-400" />
                <span>Farm Estate</span>
              </label>
              <select
                value={farmId}
                onChange={(e) => {
                  setFarmId(e.target.value);
                  setFieldId("");
                }}
                className="w-full px-3 py-2 rounded-xl border border-earth-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 text-earth-800"
              >
                <option value="">No specific farm</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Field Plot (Optional)
              </label>
              <select
                value={fieldId}
                onChange={(e) => setFieldId(e.target.value)}
                disabled={!farmId}
                className="w-full px-3 py-2 rounded-xl border border-earth-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 text-earth-800 disabled:bg-earth-100 disabled:text-earth-400"
              >
                <option value="">No specific field</option>
                {availableFields.map((fld) => (
                  <option key={fld.id} value={fld.id}>
                    {fld.name} ({fld.area} {fld.area_unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1 flex items-center gap-1">
                <Tag className="h-3 w-3 text-earth-400" />
                <span>Category</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as NotificationCategory)}
                className="w-full px-3 py-2 rounded-xl border border-earth-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 text-earth-800"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Priority Level
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as NotificationPriority)}
                className="w-full px-3 py-2 rounded-xl border border-earth-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 text-earth-800"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scheduled Date and Time */}
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3 text-earth-400" />
              <span>Scheduled Date & Time <span className="text-red-500">*</span></span>
            </label>
            <input
              type="datetime-local"
              required
              value={reminderDatetime}
              onChange={(e) => setReminderDatetime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-earth-200 text-xs focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
          </div>

          {/* Recurrence Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-earth-50 border border-earth-200/60">
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1 flex items-center gap-1">
                <Repeat className="h-3 w-3 text-earth-400" />
                <span>Repeat Schedule</span>
              </label>
              <select
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as ReminderRecurrence)}
                className="w-full px-3 py-1.5 rounded-lg border border-earth-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 text-earth-800"
              >
                {RECURRENCES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {recurrenceType !== "none" && (
              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Interval ({recurrenceType === "daily" ? "Days" : recurrenceType === "weekly" ? "Weeks" : "Months"})
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 rounded-lg border border-earth-200 text-xs focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-earth-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-earth-200 bg-white text-xs font-semibold text-earth-700 hover:bg-earth-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-farm-600 text-xs font-semibold text-white hover:bg-farm-700 transition-colors shadow-2xs disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update Reminder" : "Create Reminder"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
