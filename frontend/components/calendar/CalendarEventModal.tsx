import React, { useState, useEffect } from "react";
import { Modal, Button } from "@/components/ui";
import {
  Farm,
  Field,
  Crop,
  Labour,
  CalendarEvent,
  CalendarEventCreatePayload,
  CalendarEventUpdatePayload,
  CalendarActivityType,
  CalendarEventStatus,
  CalendarEventPriority,
} from "@/types";
import { ACTIVITY_TYPE_CONFIG } from "./ActivityTypeBadge";
import {
  Calendar as CalendarIcon,
  Clock,
  Building,
  Layers,
  Wheat,
  User,
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CalendarEventCreatePayload | CalendarEventUpdatePayload) => Promise<void>;
  eventToEdit?: CalendarEvent | null;
  initialDate?: Date;
  farms: Farm[];
  fields: Field[];
  crops: Crop[];
  labours: Labour[];
}

export function CalendarEventModal({
  isOpen,
  onClose,
  onSubmit,
  eventToEdit,
  initialDate,
  farms,
  fields,
  crops,
  labours,
}: CalendarEventModalProps) {
  const isEditing = Boolean(eventToEdit);

  // Form State
  const [farmId, setFarmId] = useState<string>("");
  const [fieldId, setFieldId] = useState<string>("");
  const [cropId, setCropId] = useState<string>("");
  const [assignedLabourId, setAssignedLabourId] = useState<string>("");

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [activityType, setActivityType] = useState<string>("general_task");

  const [startDate, setStartDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("09:00");
  const [endDate, setEndDate] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("10:30");
  const [allDay, setAllDay] = useState<boolean>(false);

  const [priority, setPriority] = useState<string>("medium");
  const [status, setStatus] = useState<string>("planned");
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (eventToEdit) {
      setFarmId(eventToEdit.farm_id);
      setFieldId(eventToEdit.field_id || "");
      setCropId(eventToEdit.crop_id || "");
      setAssignedLabourId(eventToEdit.assigned_labour_id || "");
      setTitle(eventToEdit.title);
      setDescription(eventToEdit.description || "");
      setActivityType(eventToEdit.activity_type);

      // Parse start datetime
      const sDt = new Date(eventToEdit.start_datetime);
      setStartDate(sDt.toISOString().split("T")[0]);
      setStartTime(
        `${String(sDt.getHours()).padStart(2, "0")}:${String(sDt.getMinutes()).padStart(2, "0")}`
      );

      // Parse end datetime if available
      if (eventToEdit.end_datetime) {
        const eDt = new Date(eventToEdit.end_datetime);
        setEndDate(eDt.toISOString().split("T")[0]);
        setEndTime(
          `${String(eDt.getHours()).padStart(2, "0")}:${String(eDt.getMinutes()).padStart(2, "0")}`
        );
      } else {
        setEndDate("");
        setEndTime("");
      }

      setAllDay(eventToEdit.all_day);
      setPriority(eventToEdit.priority);
      setStatus(eventToEdit.status);
      setNotes(eventToEdit.notes || "");
    } else {
      // Default creation state
      const targetDate = initialDate || new Date();
      const defaultDateStr = targetDate.toISOString().split("T")[0];

      setFarmId(farms.length > 0 ? farms[0].id : "");
      setFieldId("");
      setCropId("");
      setAssignedLabourId("");
      setTitle("");
      setDescription("");
      setActivityType("general_task");
      setStartDate(defaultDateStr);
      setStartTime("09:00");
      setEndDate(defaultDateStr);
      setEndTime("11:00");
      setAllDay(false);
      setPriority("medium");
      setStatus("planned");
      setNotes("");
    }
    setErrorMessage(null);
  }, [eventToEdit, initialDate, farms, isOpen]);

  // Dependent cascading options
  const filteredFields = fields.filter((f) => (farmId ? f.farm_id === farmId : true));
  const filteredCrops = crops.filter((c) => {
    if (fieldId) return c.field_id === fieldId;
    if (farmId) {
      const fieldIds = new Set(filteredFields.map((f) => f.id));
      return fieldIds.has(c.field_id);
    }
    return true;
  });
  const filteredLabour = labours.filter((l) => (farmId ? l.farm_id === farmId : true));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Activity title is required.");
      return;
    }
    if (!farmId) {
      setErrorMessage("Please select a farm estate.");
      return;
    }
    if (!startDate) {
      setErrorMessage("Start date is required.");
      return;
    }

    // Build ISO start & end timestamps
    let startIso: string;
    let endIso: string | null = null;

    if (allDay) {
      startIso = `${startDate}T00:00:00Z`;
      if (endDate) {
        endIso = `${endDate}T23:59:59Z`;
      }
    } else {
      startIso = `${startDate}T${startTime || "00:00"}:00Z`;
      if (endDate && endTime) {
        endIso = `${endDate}T${endTime}:00Z`;
      } else if (endDate) {
        endIso = `${endDate}T23:59:59Z`;
      }
    }

    if (endIso && new Date(endIso) < new Date(startIso)) {
      setErrorMessage("End date and time cannot precede start date and time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CalendarEventCreatePayload | CalendarEventUpdatePayload = {
        farm_id: farmId,
        field_id: fieldId || null,
        crop_id: cropId || null,
        assigned_labour_id: assignedLabourId || null,
        title: title.trim(),
        description: description.trim() || null,
        activity_type: activityType,
        start_datetime: startIso,
        end_datetime: endIso,
        all_day: allDay,
        priority,
        status,
        notes: notes.trim() || null,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to schedule calendar activity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Activity: ${eventToEdit?.title}` : "Schedule Farm Activity"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Activity Title <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Sector 2 Drip Flushing or Wheat Foliar Spray"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Activity Type & Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Activity Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {Object.entries(ACTIVITY_TYPE_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Priority Level <span className="text-rose-500">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
          </div>
        </div>

        {/* Relational Scope: Farm -> Field -> Crop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Farm <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={farmId}
              onChange={(e) => {
                setFarmId(e.target.value);
                setFieldId("");
                setCropId("");
                setAssignedLabourId("");
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field (Optional)
            </label>
            <select
              value={fieldId}
              onChange={(e) => {
                setFieldId(e.target.value);
                setCropId("");
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All / Entire Farm</option>
              {filteredFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Crop Batch (Optional)
            </label>
            <select
              value={cropId}
              onChange={(e) => setCropId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Select Crop...</option>
              {filteredCrops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.variety || "Standard"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Timing Section & All-Day Toggle */}
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Schedule Window
            </span>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={allDay}
                onChange={(e) => setAllDay(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <span>All-Day Activity</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date & Time */}
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate) setEndDate(e.target.value);
                  }}
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-28 px-2 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                )}
              </div>
            </div>

            {/* End Date & Time */}
            <div>
              <label className="block text-xs text-slate-600 mb-1 font-medium">
                End Date (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none"
                />
                {!allDay && (
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-28 px-2 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Workforce & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Assigned Worker (Optional)
            </label>
            <select
              value={assignedLabourId}
              onChange={(e) => setAssignedLabourId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Unassigned</option>
              {filteredLabour.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.work_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Workflow Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Description & Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Description & Instructions
          </label>
          <textarea
            rows={2}
            placeholder="Operational specifications, machinery instructions, or chemical dosages..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
            Internal Field Notes
          </label>
          <textarea
            rows={2}
            placeholder="Post-activity remarks or reminders..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-w-[130px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {isEditing ? "Save Changes" : "Schedule Event"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CalendarEventModal;
