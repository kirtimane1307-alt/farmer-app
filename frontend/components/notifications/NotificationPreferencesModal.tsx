"use client";

import React, { useState, useEffect } from "react";
import { X, Settings, Check, Bell, Shield } from "lucide-react";
import { NotificationPreferenceItem, NotificationCategory } from "@/types";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: NotificationPreferenceItem[];
  onSave: (preferences: NotificationPreferenceItem[]) => Promise<void>;
}

interface CategoryMeta {
  key: NotificationCategory;
  label: string;
  description: string;
}

const CATEGORY_META: CategoryMeta[] = [
  {
    key: "crop",
    label: "Crop Sowing & Maturity",
    description: "Alerts for upcoming sowing dates, crop growth milestones, and harvest windows.",
  },
  {
    key: "irrigation",
    label: "Irrigation Schedules",
    description: "Reminders for planned irrigation cycles and alerts for missed watering tasks.",
  },
  {
    key: "fertilizer_pesticide",
    label: "Fertilizer & Pesticide Schedules",
    description: "Timely alerts for planned fertilizer top-dressing and pest spray operations.",
  },
  {
    key: "labour_attendance",
    label: "Labour & Attendance Monitoring",
    description: "Daily notifications if active worker attendance logs have not been recorded.",
  },
  {
    key: "salary_payment",
    label: "Salary & Wage Payments",
    description: "Reminders for pending wage balances, pay periods, and outstanding labour dues.",
  },
  {
    key: "harvest",
    label: "Harvest Operations",
    description: "Alerts for scheduled harvest runs, yield collection, and crop maturity deadlines.",
  },
  {
    key: "expense_finance",
    label: "Expenses & Operational Liabilities",
    description: "Reminders for pending operational expenses and unpaid vendor invoices.",
  },
  {
    key: "equipment_maintenance",
    label: "Machinery & Equipment Service",
    description: "Alerts when tractors, pumps, or tools are due or overdue for periodic service.",
  },
  {
    key: "calendar_event",
    label: "Farm Calendar Tasks",
    description: "Notifications for general calendar tasks, soil testing, and planned farm visits.",
  },
  {
    key: "custom_reminder",
    label: "Custom User Reminders",
    description: "Alerts generated from personal reminders and recurring agricultural routines.",
  },
  {
    key: "general",
    label: "System & General Farm Notices",
    description: "General administrative notices and operational bulletins.",
  },
];

export function NotificationPreferencesModal({
  isOpen,
  onClose,
  preferences,
  onSave,
}: NotificationPreferencesModalProps) {
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferenceItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (preferences.length > 0) {
      setLocalPrefs(preferences);
    } else {
      // Default all categories enabled with 1 day notice
      setLocalPrefs(
        CATEGORY_META.map((c) => ({
          category: c.key,
          is_enabled: true,
          advance_notice_days: 1,
        }))
      );
    }
  }, [preferences, isOpen]);

  if (!isOpen) return null;

  const handleToggle = (cat: NotificationCategory) => {
    setLocalPrefs((prev) =>
      prev.map((item) =>
        item.category === cat ? { ...item, is_enabled: !item.is_enabled } : item
      )
    );
  };

  const handleNoticeDaysChange = (cat: NotificationCategory, days: number) => {
    setLocalPrefs((prev) =>
      prev.map((item) =>
        item.category === cat ? { ...item, advance_notice_days: days } : item
      )
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave(localPrefs);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 800);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-earth-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-earth-100 px-6 py-4 bg-earth-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-farm-100 text-farm-700">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-earth-900 text-base">
                Notification & Alert Preferences
              </h3>
              <p className="text-xs text-earth-500">
                Configure operational categories and advance notice windows
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

        {/* Categories List */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3.5 divide-y divide-earth-100">
          {CATEGORY_META.map((meta) => {
            const current = localPrefs.find((p) => p.category === meta.key) || {
              category: meta.key,
              is_enabled: true,
              advance_notice_days: 1,
            };

            return (
              <div
                key={meta.key}
                className="pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Info */}
                <div className="space-y-0.5 flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-earth-900">
                      {meta.label}
                    </span>
                    {!current.is_enabled && (
                      <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-earth-100 text-earth-500">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-earth-500 leading-snug">
                    {meta.description}
                  </p>
                </div>

                {/* Right: Controls (Toggle + Advance Notice Window) */}
                <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                  {/* Advance Notice Dropdown */}
                  <div className="flex items-center gap-1.5 text-xs text-earth-600">
                    <span className="text-[11px] text-earth-400">Notice:</span>
                    <select
                      value={current.advance_notice_days}
                      disabled={!current.is_enabled}
                      onChange={(e) =>
                        handleNoticeDaysChange(meta.key, parseInt(e.target.value))
                      }
                      className="px-2 py-1 rounded-lg border border-earth-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-farm-500 disabled:opacity-50 disabled:bg-earth-100"
                    >
                      <option value={0}>Same day (0d)</option>
                      <option value={1}>1 day before</option>
                      <option value={2}>2 days before</option>
                      <option value={3}>3 days before</option>
                      <option value={7}>7 days before</option>
                    </select>
                  </div>

                  {/* Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggle(meta.key)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      current.is_enabled ? "bg-farm-600" : "bg-earth-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        current.is_enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-earth-100 px-6 py-4 bg-earth-50/50">
          <div className="flex items-center gap-1.5 text-xs text-earth-500">
            <Shield className="h-4 w-4 text-farm-600" />
            <span>Preferences are saved per user account</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl border border-earth-200 bg-white text-xs font-semibold text-earth-700 hover:bg-earth-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-farm-600 text-xs font-semibold text-white hover:bg-farm-700 transition-colors shadow-2xs disabled:opacity-60"
            >
              {saveSuccess ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Saved!</span>
                </>
              ) : isSaving ? (
                <span>Saving...</span>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

