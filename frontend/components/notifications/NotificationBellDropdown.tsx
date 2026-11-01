"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  RefreshCw,
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
  ExternalLink,
} from "lucide-react";
import { notificationsApi } from "@/lib/api/notifications";
import { NotificationItem, NotificationSummary, NotificationCategory } from "@/types";

export function NotificationBellDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [summary, setSummary] = useState<NotificationSummary | null>(null);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load summary and notifications
  const loadData = async () => {
    try {
      const [sumRes, listRes] = await Promise.all([
        notificationsApi.getSummary(),
        notificationsApi.list({ limit: 6, is_read: false }),
      ]);
      if (!sumRes.error && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (!listRes.error && listRes.data) {
        setRecentNotifications(listRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    loadData();
    // Poll telemetry every 45 seconds
    const interval = setInterval(loadData, 45000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleMarkAllRead = async () => {
    try {
      setIsLoading(true);
      await notificationsApi.markAllAsRead();
      await loadData();
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScan = async () => {
    try {
      setIsScanning(true);
      await notificationsApi.triggerScan();
      await loadData();
    } catch (err) {
      console.error("Failed to trigger scan:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    try {
      if (!item.is_read) {
        await notificationsApi.markAsRead(item.id);
        setRecentNotifications((prev) => prev.filter((n) => n.id !== item.id));
        setSummary((prev) =>
          prev
            ? {
                ...prev,
                unread_notifications: Math.max(0, prev.unread_notifications - 1),
              }
            : null
        );
      }
      setIsOpen(false);
      if (item.action_url) {
        router.push(item.action_url);
      } else {
        router.push("/notifications");
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

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

  const getRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Recently";
    }
  };

  const unreadCount = summary?.unread_notifications || 0;
  const hasUrgent = (summary?.urgent_notifications || 0) > 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) loadData();
        }}
        aria-label="Notifications"
        className={`relative rounded-xl p-2 text-earth-600 hover:bg-earth-100 transition-colors focus:outline-none focus:ring-2 focus:ring-farm-500/20 ${
          isOpen ? "bg-earth-100 text-farm-700" : ""
        }`}
        title={`${unreadCount} unread notification(s)`}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-xs ${
              hasUrgent ? "bg-red-600 animate-pulse" : "bg-farm-600"
            }`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-earth-200 bg-white shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-earth-100 px-4 py-3 bg-earth-50/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-earth-900 text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-farm-100 px-2 py-0.5 text-[11px] font-semibold text-farm-800">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleScan}
                disabled={isScanning}
                className="p-1 rounded-lg text-earth-500 hover:text-earth-800 hover:bg-earth-200/50 transition-colors"
                title="Scan farm operational tasks now"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isScanning ? "animate-spin text-farm-600" : ""}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-earth-600 hover:text-farm-700 hover:bg-earth-200/50 rounded-lg transition-colors"
                  title="Mark all notifications as read"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span>Mark read</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-earth-100">
            {recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="h-10 w-10 rounded-full bg-farm-50 text-farm-600 flex items-center justify-center mb-2">
                  <CheckCheck className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-earth-900">All caught up!</p>
                <p className="text-[11px] text-earth-500 mt-0.5">
                  No unread alerts or pending reminders right now.
                </p>
              </div>
            ) : (
              recentNotifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleItemClick(notif)}
                  className={`flex items-start gap-3 p-3 transition-colors cursor-pointer hover:bg-earth-50 ${
                    !notif.is_read ? "bg-farm-50/20" : ""
                  }`}
                >
                  {/* Category icon */}
                  <div className="mt-0.5 flex-shrink-0 h-7 w-7 rounded-lg bg-earth-100 flex items-center justify-center">
                    {getCategoryIcon(notif.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-earth-900 truncate">
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-earth-400 whitespace-nowrap">
                        {getRelativeTime(notif.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-earth-600 line-clamp-2 mt-0.5 leading-snug">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className={`text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase ${
                          notif.priority === "urgent"
                            ? "bg-red-100 text-red-700 font-bold"
                            : notif.priority === "high"
                            ? "bg-amber-100 text-amber-800"
                            : notif.priority === "low"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-earth-100 text-earth-600"
                        }`}
                      >
                        {notif.priority}
                      </span>
                      {notif.farm_name && (
                        <span className="text-[10px] text-earth-400 truncate max-w-[120px]">
                          {notif.farm_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action arrow or dot */}
                  <div className="mt-1 flex-shrink-0">
                    <div className="h-1.5 w-1.5 rounded-full bg-farm-600" />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-earth-100 p-2 bg-earth-50/50 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-farm-700 hover:text-farm-800 py-1 transition-colors"
            >
              <span>View all notifications & reminders</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
