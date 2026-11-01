"use client";

import React, { useState } from "react";
import {
  Clock,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Calendar,
  Repeat,
  Edit2,
  Trash2,
  AlertCircle,
  MapPin,
  Wheat,
} from "lucide-react";
import { ReminderItem, Farm } from "@/types";

interface ReminderListProps {
  reminders: ReminderItem[];
  farms: Farm[];
  isLoading: boolean;
  selectedFarmId: string;
  selectedCategory: string;
  selectedPriority: string;
  activeStatusTab: "all" | "pending" | "overdue" | "completed";
  searchQuery: string;
  onSelectFarm: (farmId: string) => void;
  onSelectCategory: (category: string) => void;
  onSelectPriority: (priority: string) => void;
  onSelectStatusTab: (tab: "all" | "pending" | "overdue" | "completed") => void;
  onSearchChange: (query: string) => void;
  onOpenCreateModal: () => void;
  onOpenEditModal: (reminder: ReminderItem) => void;
  onCompleteReminder: (id: string) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
}

export function ReminderList({
  reminders,
  farms,
  isLoading,
  selectedFarmId,
  selectedCategory,
  selectedPriority,
  activeStatusTab,
  searchQuery,
  onSelectFarm,
  onSelectCategory,
  onSelectPriority,
  onSelectStatusTab,
  onSearchChange,
  onOpenCreateModal,
  onOpenEditModal,
  onCompleteReminder,
  onDeleteReminder,
}: ReminderListProps) {
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    try {
      await onCompleteReminder(id);
    } finally {
      setCompletingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this reminder?")) {
      setDeletingId(id);
      try {
        await onDeleteReminder(id);
      } finally {
        setDeletingId(null);
      }
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

  const pendingCount = reminders.filter((r) => r.status === "pending").length;
  const overdueCount = reminders.filter((r) => r.status === "overdue").length;

  return (
    <div className="rounded-2xl border border-earth-200 bg-white shadow-2xs overflow-hidden">
      {/* Top Header & Filters */}
      <div className="border-b border-earth-200 p-4 sm:p-5 space-y-4">
        {/* Row 1: Status Tabs + "+ Create Reminder" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-earth-100/70 text-xs font-medium text-earth-600">
            <button
              type="button"
              onClick={() => onSelectStatusTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeStatusTab === "all"
                  ? "bg-white text-earth-900 shadow-2xs font-semibold"
                  : "hover:text-earth-900"
              }`}
            >
              All Reminders
            </button>
            <button
              type="button"
              onClick={() => onSelectStatusTab("pending")}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeStatusTab === "pending"
                  ? "bg-white text-earth-900 shadow-2xs font-semibold"
                  : "hover:text-earth-900"
              }`}
            >
              <span>Pending</span>
              {pendingCount > 0 && (
                <span className="rounded-full bg-farm-600 px-1.5 py-0.2 text-[10px] text-white font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onSelectStatusTab("overdue")}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeStatusTab === "overdue"
                  ? "bg-white text-red-700 shadow-2xs font-semibold"
                  : "hover:text-earth-900"
              }`}
            >
              <span>Overdue</span>
              {overdueCount > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] text-white font-bold">
                  {overdueCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => onSelectStatusTab("completed")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeStatusTab === "completed"
                  ? "bg-white text-earth-900 shadow-2xs font-semibold"
                  : "hover:text-earth-900"
              }`}
            >
              Completed
            </button>
          </div>

          {/* New Reminder Button */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-farm-600 text-xs font-semibold text-white hover:bg-farm-700 transition-colors shadow-2xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create Reminder</span>
          </button>
        </div>

        {/* Row 2: Search + Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-earth-400" />
            <input
              type="text"
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-earth-200 text-xs focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
          </div>

          <select
            value={selectedFarmId}
            onChange={(e) => onSelectFarm(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-earth-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 text-earth-800"
          >
            <option value="">All Farms</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          <select
            value={selectedPriority}
            onChange={(e) => onSelectPriority(e.target.value)}
            className="w-full px-3 py-1.5 rounded-xl border border-earth-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 text-earth-800"
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Reminders List */}
      <div className="divide-y divide-earth-100">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-earth-500">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-farm-600 border-t-transparent mb-2" />
            <p>Loading reminders...</p>
          </div>
        ) : reminders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-earth-100 text-earth-400 flex items-center justify-center mb-3">
              <Clock className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-earth-900">No Reminders Found</h4>
            <p className="text-xs text-earth-500 mt-1 max-w-sm mx-auto">
              Stay ahead of your agricultural schedule by scheduling custom tasks and reminders.
            </p>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-farm-600 text-xs font-semibold text-white hover:bg-farm-700 transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Your First Reminder</span>
            </button>
          </div>
        ) : (
          reminders.map((rem) => {
            const isCompleted = rem.status === "completed";
            const isOverdue = rem.status === "overdue";

            return (
              <div
                key={rem.id}
                className={`p-4 sm:p-5 transition-colors hover:bg-earth-50/70 flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                  isOverdue ? "bg-red-50/20" : isCompleted ? "opacity-60 bg-earth-50/40" : ""
                }`}
              >
                {/* Left: Completion Toggle + Details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Complete Action Button */}
                  <button
                    type="button"
                    onClick={() => handleComplete(rem.id)}
                    disabled={completingId === rem.id || isCompleted}
                    className={`mt-0.5 flex-shrink-0 p-1 rounded-full transition-colors ${
                      isCompleted
                        ? "text-farm-600 cursor-default"
                        : "text-earth-300 hover:text-farm-600 hover:bg-farm-50"
                    }`}
                    title={isCompleted ? "Completed" : "Click to mark completed"}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-farm-600 fill-farm-100" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-semibold text-earth-900 ${
                          isCompleted ? "line-through text-earth-500" : ""
                        }`}
                      >
                        {rem.title}
                      </span>

                      {/* Status Badges */}
                      {isOverdue && (
                        <span className="inline-flex items-center px-2 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white animate-pulse">
                          OVERDUE
                        </span>
                      )}

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md border uppercase ${getPriorityBadgeClass(
                          rem.priority
                        )}`}
                      >
                        {rem.priority}
                      </span>

                      {/* Recurrence Pill */}
                      {rem.recurrence_type !== "none" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <Repeat className="h-3 w-3" />
                          <span>Repeats {rem.recurrence_type}</span>
                        </span>
                      )}
                    </div>

                    {rem.description && (
                      <p className="text-xs text-earth-600 leading-relaxed max-w-2xl">
                        {rem.description}
                      </p>
                    )}

                    {/* Meta Tags: Due Date, Farm, Field, Crop */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-earth-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-earth-400" />
                        <strong className={isOverdue ? "text-red-700 font-semibold" : ""}>
                          {formatDateTime(rem.reminder_datetime)}
                        </strong>
                      </span>

                      {rem.farm_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-earth-400" />
                          <span>{rem.farm_name}</span>
                        </span>
                      )}

                      {rem.field_name && (
                        <span>• Plot: {rem.field_name}</span>
                      )}

                      {rem.crop_name && (
                        <span className="flex items-center gap-1">
                          <Wheat className="h-3 w-3 text-emerald-500" />
                          <span>{rem.crop_name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Edit & Delete Buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-center flex-shrink-0 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => onOpenEditModal(rem)}
                    className="p-1.5 rounded-lg border border-earth-200 bg-white text-earth-500 hover:text-earth-900 hover:bg-earth-50 transition-colors shadow-2xs"
                    title="Edit reminder"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(rem.id)}
                    disabled={deletingId === rem.id}
                    className="p-1.5 rounded-lg border border-earth-200 bg-white text-earth-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors shadow-2xs"
                    title="Delete reminder"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

