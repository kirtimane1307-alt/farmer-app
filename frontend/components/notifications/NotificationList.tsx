"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  Wheat,
  Droplets,
  FlaskConical,
  Users,
  CreditCard,
  Package,
  Receipt,
  Wrench,
  Calendar,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";
import { NotificationItem, NotificationCategory, Farm } from "@/types";

interface NotificationListProps {
  notifications: NotificationItem[];
  farms: Farm[];
  isLoading: boolean;
  isScanning: boolean;
  selectedFarmId: string;
  selectedCategory: string;
  selectedPriority: string;
  activeTab: "all" | "unread" | "urgent";
  searchQuery: string;
  onSelectFarm: (farmId: string) => void;
  onSelectCategory: (category: string) => void;
  onSelectPriority: (priority: string) => void;
  onSelectTab: (tab: "all" | "unread" | "urgent") => void;
  onSearchChange: (query: string) => void;
  onMarkAsRead: (id: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onDeleteNotification: (id: string) => Promise<void>;
  onTriggerScan: () => Promise<void>;
}

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Categories" },
  { value: "crop", label: "Crops" },
  { value: "irrigation", label: "Irrigation" },
  { value: "fertilizer_pesticide", label: "Fertilizer & Pesticide" },
  { value: "labour_attendance", label: "Labour & Attendance" },
  { value: "salary_payment", label: "Salary & Payments" },
  { value: "harvest", label: "Harvest Operations" },
  { value: "expense_finance", label: "Expenses & Finance" },
  { value: "equipment_maintenance", label: "Machinery & Equipment" },
  { value: "calendar_event", label: "Farm Calendar" },
  { value: "custom_reminder", label: "Custom Reminders" },
  { value: "general", label: "General" },
];

export function NotificationList({
  notifications,
  farms,
  isLoading,
  isScanning,
  selectedFarmId,
  selectedCategory,
  selectedPriority,
  activeTab,
  searchQuery,
  onSelectFarm,
  onSelectCategory,
  onSelectPriority,
  onSelectTab,
  onSearchChange,
  onMarkAsRead,
  onMarkAllRead,
  onDeleteNotification,
  onTriggerScan,
}: NotificationListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "crop":
        return <Wheat className="h-4 w-4 text-emerald-600" />;
      case "irrigation":
        return <Droplets className="h-4 w-4 text-blue-600" />;
      case "fertilizer_pesticide":
        return <FlaskConical className="h-4 w-4 text-teal-600" />;
      case "labour_attendance":
        return <Users className="h-4 w-4 text-amber-600" />;
      case "salary_payment":
        return <CreditCard className="h-4 w-4 text-purple-600" />;
      case "harvest":
        return <Package className="h-4 w-4 text-orange-600" />;
      case "expense_finance":
        return <Receipt className="h-4 w-4 text-rose-600" />;
      case "equipment_maintenance":
        return <Wrench className="h-4 w-4 text-red-600" />;
      case "calendar_event":
        return <Calendar className="h-4 w-4 text-indigo-600" />;
      case "custom_reminder":
        return <Clock className="h-4 w-4 text-farm-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-earth-600" />;
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200 font-bold";
      case "high":
        return "bg-amber-100 text-amber-800 border-amber-200 font-semibold";
      case "low":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-earth-100 text-earth-700 border-earth-200";
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this notification?")) {
      setDeletingId(id);
      try {
        await onDeleteNotification(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="rounded-2xl border border-earth-200 bg-white shadow-2xs overflow-hidden">
      {/* Top Filter & Action Bar */}
      <div className="border-b border-earth-200 p-4 sm:p-5 space-y-4">
        {/* Row 1: Tabs + Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-earth-100/70 text-xs font-medium text-earth-600">
            <button
              type="button"
              onClick={() => onSelectTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "all"
                  ? "bg-white text-earth-900 shadow-2xs font-semibold"
                  : "hover:text-earth-900"
              }`}
            >
              All Notifications
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("unread")}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === "unread"
                  ? "bg-white text-earth-900 shadow-2xs font-semibold"
                  : "hover:text-earth-900"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-farm-600 px-1.5 py-0.2 text-[10px] text-white font-bold">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onSelectTab("urgent")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === "urgent"
                  ? "bg-white text-red-700 shadow-2xs font-semibold"
                  : "hover:text-earth-900"
              }`}
            >
              Urgent & High
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTriggerScan}
              disabled={isScanning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-earth-200 bg-white text-xs font-semibold text-earth-700 hover:bg-earth-50 hover:text-earth-900 transition-colors shadow-2xs disabled:opacity-60"
              title="Scan operational records across farms now"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin text-farm-600" : ""}`} />
              <span>{isScanning ? "Scanning..." : "Scan & Check Now"}</span>
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-farm-50 text-xs font-semibold text-farm-700 hover:bg-farm-100 hover:text-farm-800 transition-colors shadow-2xs border border-farm-200"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Search & Filter Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-earth-400" />
            <input
              type="text"
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-earth-200 text-xs focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => onSelectCategory(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-earth-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 text-earth-800"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Farm Dropdown */}
          <select
            value={selectedFarmId}
            onChange={(e) => onSelectFarm(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-earth-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 text-earth-800"
          >
            <option value="">All Farms</option>
            {farms.map((farm) => (
              <option key={farm.id} value={farm.id}>
                {farm.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications List Content */}
      <div className="divide-y divide-earth-100">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-earth-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-farm-600 border-t-transparent mb-2" />
            <p>Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-earth-100 text-earth-400 flex items-center justify-center mb-3">
              <Bell className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-earth-900">No Notifications Found</h4>
            <p className="text-xs text-earth-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedCategory || selectedFarmId
                ? "No alerts match the selected criteria. Try adjusting your filters."
                : "All operations are currently running smoothly with no pending alerts."}
            </p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 sm:p-5 transition-colors hover:bg-earth-50/70 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                !notif.is_read ? "bg-farm-50/25" : ""
              }`}
            >
              {/* Left Column: Icon + Content */}
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="mt-0.5 flex-shrink-0 h-9 w-9 rounded-xl bg-earth-100 border border-earth-200 flex items-center justify-center shadow-2xs">
                  {getCategoryIcon(notif.category)}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-earth-900">
                      {notif.title}
                    </span>
                    {!notif.is_read && (
                      <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-farm-600 text-white">
                        NEW
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md border uppercase ${getPriorityBadgeClass(
                        notif.priority
                      )}`}
                    >
                      {notif.priority}
                    </span>
                  </div>

                  <p className="text-xs text-earth-700 leading-relaxed max-w-3xl">
                    {notif.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-earth-400">
                    <span>{formatTimestamp(notif.created_at)}</span>
                    {notif.farm_name && (
                      <>
                        <span>•</span>
                        <span className="font-medium text-earth-600">{notif.farm_name}</span>
                      </>
                    )}
                    {notif.related_module && (
                      <>
                        <span>•</span>
                        <span className="capitalize text-earth-500">
                          {notif.related_module} Module
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0">
                {!notif.is_read && (
                  <button
                    type="button"
                    onClick={() => onMarkAsRead(notif.id)}
                    className="p-1.5 rounded-lg border border-earth-200 bg-white text-earth-600 hover:text-farm-700 hover:bg-earth-50 transition-colors shadow-2xs"
                    title="Mark as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}

                {notif.action_url && (
                  <Link
                    href={notif.action_url}
                    className="p-1.5 rounded-lg border border-earth-200 bg-white text-earth-600 hover:text-farm-700 hover:bg-earth-50 transition-colors shadow-2xs"
                    title="Navigate to module"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(notif.id)}
                  disabled={deletingId === notif.id}
                  className="p-1.5 rounded-lg border border-earth-200 bg-white text-earth-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors shadow-2xs"
                  title="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

