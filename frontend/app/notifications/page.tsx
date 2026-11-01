"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Clock,
  Settings,
  RefreshCw,
  Plus,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { NotificationSummaryCards } from "@/components/notifications/NotificationSummaryCards";
import { NotificationList } from "@/components/notifications/NotificationList";
import { ReminderList } from "@/components/notifications/ReminderList";
import { ReminderFormModal } from "@/components/notifications/ReminderFormModal";
import { NotificationPreferencesModal } from "@/components/notifications/NotificationPreferencesModal";

import {
  notificationsApi,
  remindersApi,
  notificationPreferencesApi,
} from "@/lib/api/notifications";
import { farmsApi } from "@/lib/api/farms";
import {
  NotificationItem,
  NotificationSummary,
  ReminderItem,
  ReminderCreateInput,
  ReminderUpdateInput,
  NotificationPreferenceItem,
  Farm,
  ScanResults,
} from "@/types";

export default function NotificationsPage() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<"notifications" | "reminders">("notifications");
  const [notifSubTab, setNotifSubTab] = useState<"all" | "unread" | "urgent">("all");
  const [reminderSubTab, setReminderSubTab] = useState<"all" | "pending" | "overdue" | "completed">("all");

  // Telemetry & Data
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferenceItem[]>([]);

  // Filters
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Loading States
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isLoadingReminders, setIsLoadingReminders] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  // Modals
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderItem | null>(null);
  const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);

  // Banner Notification Message
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "info" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "info" | "error" = "success") => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // -------------------------------------------------------------------------
  // Data Loaders
  // -------------------------------------------------------------------------

  const loadSummary = useCallback(async () => {
    try {
      setIsLoadingSummary(true);
      const res = await notificationsApi.getSummary(selectedFarmId || undefined);
      if (!res.error && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error("Failed to load notification summary:", err);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [selectedFarmId]);

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoadingNotifications(true);
      const params: Record<string, any> = {
        limit: 100,
        farm_id: selectedFarmId || undefined,
        category: selectedCategory || undefined,
        search: searchQuery.trim() || undefined,
      };

      if (notifSubTab === "unread") {
        params.is_read = false;
      } else if (notifSubTab === "urgent") {
        params.priority = "urgent";
      } else if (selectedPriority) {
        params.priority = selectedPriority;
      }

      const res = await notificationsApi.list(params);
      if (!res.error && res.data) {
        setNotifications(res.data);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [selectedFarmId, selectedCategory, selectedPriority, notifSubTab, searchQuery]);

  const loadReminders = useCallback(async () => {
    try {
      setIsLoadingReminders(true);
      const params: Record<string, any> = {
        limit: 100,
        farm_id: selectedFarmId || undefined,
        category: selectedCategory || undefined,
        priority: selectedPriority || undefined,
        search: searchQuery.trim() || undefined,
      };

      if (reminderSubTab !== "all") {
        params.status = reminderSubTab;
      }

      const res = await remindersApi.list(params);
      if (!res.error && res.data) {
        setReminders(res.data);
      }
    } catch (err) {
      console.error("Failed to load reminders:", err);
    } finally {
      setIsLoadingReminders(false);
    }
  }, [selectedFarmId, selectedCategory, selectedPriority, reminderSubTab, searchQuery]);

  // Initial Load: Farms & Preferences
  useEffect(() => {
    farmsApi
      .getFarms()
      .then((res) => {
        if (!res.error && res.data) setFarms(res.data);
      })
      .catch((err) => console.error("Failed to fetch farms:", err));

    notificationPreferencesApi
      .get()
      .then((res) => {
        if (!res.error && res.data) setPreferences(res.data);
      })
      .catch((err) => console.error("Failed to fetch preferences:", err));
  }, []);

  // Sync on dependencies
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (activeTab === "notifications") {
      loadNotifications();
    } else {
      loadReminders();
    }
  }, [activeTab, loadNotifications, loadReminders]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await notificationsApi.markAsRead(id);
      if (!res.error && res.data) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        );
        loadSummary();
      }
    } catch (err) {
      showToast("Failed to mark notification as read", "error");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await notificationsApi.markAllAsRead(
        selectedFarmId || undefined,
        selectedCategory || undefined
      );
      if (!res.error && res.data) {
        showToast(`Marked ${res.data.updated_count} notification(s) as read`);
        loadNotifications();
        loadSummary();
      }
    } catch (err) {
      showToast("Failed to mark all as read", "error");
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      const res = await notificationsApi.delete(id);
      if (!res.error) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        loadSummary();
        showToast("Notification deleted successfully");
      }
    } catch (err) {
      showToast("Failed to delete notification", "error");
    }
  };

  const handleTriggerScan = async () => {
    try {
      setIsScanning(true);
      const res = await notificationsApi.triggerScan();
      if (!res.error && res.data) {
        const scan = res.data;
        showToast(
          `Scan completed: ${scan.notifications_created} alert(s) generated from ${scan.reminders_evaluated} operational records.`,
          "info"
        );
        loadNotifications();
        loadReminders();
        loadSummary();
      }
    } catch (err) {
      showToast("Scan encountered an error", "error");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveReminder = async (data: ReminderCreateInput | ReminderUpdateInput) => {
    if (editingReminder) {
      const res = await remindersApi.update(editingReminder.id, data as ReminderUpdateInput);
      if (!res.error && res.data) {
        showToast("Reminder updated successfully");
        loadReminders();
        loadSummary();
      }
    } else {
      const res = await remindersApi.create(data as ReminderCreateInput);
      if (!res.error && res.data) {
        showToast("Reminder created successfully");
        loadReminders();
        loadSummary();
      }
    }
  };

  const handleCompleteReminder = async (id: string) => {
    try {
      const res = await remindersApi.complete(id);
      if (!res.error && res.data) {
        const updated = res.data;
        if (updated.recurrence_type !== "none") {
          showToast(`Reminder completed and rolled over to next occurrence (${updated.recurrence_type})`);
        } else {
          showToast("Reminder marked as completed");
        }
        loadReminders();
        loadSummary();
      }
    } catch (err) {
      showToast("Failed to complete reminder", "error");
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      const res = await remindersApi.delete(id);
      if (!res.error) {
        setReminders((prev) => prev.filter((r) => r.id !== id));
        loadSummary();
        showToast("Reminder deleted");
      }
    } catch (err) {
      showToast("Failed to delete reminder", "error");
    }
  };

  const handleSavePreferences = async (newPrefs: NotificationPreferenceItem[]) => {
    const res = await notificationPreferencesApi.update(newPrefs);
    if (!res.error && res.data) {
      setPreferences(res.data);
      showToast("Notification preferences updated");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2 duration-150 ${
            toastMessage.type === "success"
              ? "bg-farm-50 border-farm-200 text-farm-800"
              : toastMessage.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-blue-50 border-blue-200 text-blue-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" && <CheckCircle className="h-4 w-4 text-farm-600" />}
            {toastMessage.type === "error" && <AlertTriangle className="h-4 w-4 text-red-600" />}
            {toastMessage.type === "info" && <Info className="h-4 w-4 text-blue-600" />}
            <span>{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-earth-400 hover:text-earth-700 ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-earth-900">
              Notifications & Reminders
            </h1>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-farm-100 text-farm-700">
              Phase 19
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-earth-600">
            Automated alerts from real farm operations, crop milestones, maintenance schedules, and custom reminders.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsPreferencesModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-earth-200 bg-white text-xs font-semibold text-earth-700 hover:bg-earth-50 transition-colors shadow-2xs"
            title="Configure alert rules and notice windows"
          >
            <Settings className="h-4 w-4 text-earth-500" />
            <span className="hidden sm:inline">Preferences</span>
          </button>

          <button
            type="button"
            onClick={handleTriggerScan}
            disabled={isScanning}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-earth-200 bg-white text-xs font-semibold text-earth-700 hover:bg-earth-50 transition-colors shadow-2xs disabled:opacity-60"
            title="Scan database records now"
          >
            <RefreshCw className={`h-4 w-4 ${isScanning ? "animate-spin text-farm-600" : "text-earth-500"}`} />
            <span>{isScanning ? "Scanning..." : "Scan & Check Now"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingReminder(null);
              setIsReminderModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-farm-600 text-xs font-semibold text-white hover:bg-farm-700 transition-colors shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            <span>New Reminder</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <NotificationSummaryCards summary={summary} isLoading={isLoadingSummary} />

      {/* Main Tabs Navigation: Notifications vs Custom Reminders */}
      <div className="flex items-center border-b border-earth-200">
        <button
          type="button"
          onClick={() => setActiveTab("notifications")}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "notifications"
              ? "border-farm-600 text-farm-700"
              : "border-transparent text-earth-500 hover:text-earth-800"
          }`}
        >
          <Bell className="h-4 w-4" />
          <span>Operational Notifications</span>
          {(summary?.unread_notifications || 0) > 0 && (
            <span className="rounded-full bg-farm-100 text-farm-700 text-[11px] font-bold px-2 py-0.2">
              {summary?.unread_notifications}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reminders")}
          className={`flex items-center gap-2 pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "reminders"
              ? "border-farm-600 text-farm-700"
              : "border-transparent text-earth-500 hover:text-earth-800"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Custom Reminders</span>
          {(summary?.active_reminders || 0) > 0 && (
            <span className="rounded-full bg-earth-100 text-earth-700 text-[11px] font-bold px-2 py-0.2">
              {summary?.active_reminders}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "notifications" ? (
        <NotificationList
          notifications={notifications}
          farms={farms}
          isLoading={isLoadingNotifications}
          isScanning={isScanning}
          selectedFarmId={selectedFarmId}
          selectedCategory={selectedCategory}
          selectedPriority={selectedPriority}
          activeTab={notifSubTab}
          searchQuery={searchQuery}
          onSelectFarm={setSelectedFarmId}
          onSelectCategory={setSelectedCategory}
          onSelectPriority={setSelectedPriority}
          onSelectTab={setNotifSubTab}
          onSearchChange={setSearchQuery}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllRead={handleMarkAllRead}
          onDeleteNotification={handleDeleteNotification}
          onTriggerScan={handleTriggerScan}
        />
      ) : (
        <ReminderList
          reminders={reminders}
          farms={farms}
          isLoading={isLoadingReminders}
          selectedFarmId={selectedFarmId}
          selectedCategory={selectedCategory}
          selectedPriority={selectedPriority}
          activeStatusTab={reminderSubTab}
          searchQuery={searchQuery}
          onSelectFarm={setSelectedFarmId}
          onSelectCategory={setSelectedCategory}
          onSelectPriority={setSelectedPriority}
          onSelectStatusTab={setReminderSubTab}
          onSearchChange={setSearchQuery}
          onOpenCreateModal={() => {
            setEditingReminder(null);
            setIsReminderModalOpen(true);
          }}
          onOpenEditModal={(rem) => {
            setEditingReminder(rem);
            setIsReminderModalOpen(true);
          }}
          onCompleteReminder={handleCompleteReminder}
          onDeleteReminder={handleDeleteReminder}
        />
      )}

      {/* Modals */}
      <ReminderFormModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSubmit={handleSaveReminder}
        reminder={editingReminder}
        farms={farms}
      />

      <NotificationPreferencesModal
        isOpen={isPreferencesModalOpen}
        onClose={() => setIsPreferencesModalOpen(false)}
        preferences={preferences}
        onSave={handleSavePreferences}
      />
    </div>
  );
}
