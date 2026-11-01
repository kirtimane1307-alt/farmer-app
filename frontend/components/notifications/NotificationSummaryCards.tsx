"use client";

import React from "react";
import { Bell, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { NotificationSummary } from "@/types";

interface NotificationSummaryCardsProps {
  summary: NotificationSummary | null;
  isLoading: boolean;
}

export function NotificationSummaryCards({ summary, isLoading }: NotificationSummaryCardsProps) {
  const cards = [
    {
      title: "Total Notifications",
      value: summary?.total_notifications ?? 0,
      icon: Bell,
      color: "text-earth-700",
      bg: "bg-earth-100",
      border: "border-earth-200",
      description: "Recorded farm alerts & updates",
    },
    {
      title: "Unread Alerts",
      value: summary?.unread_notifications ?? 0,
      icon: AlertTriangle,
      color: "text-amber-700",
      bg: "bg-amber-100",
      border: "border-amber-200",
      highlight: (summary?.unread_notifications ?? 0) > 0,
      description: "Awaiting review or action",
    },
    {
      title: "Active Reminders",
      value: summary?.active_reminders ?? 0,
      icon: Clock,
      color: "text-farm-700",
      bg: "bg-farm-100",
      border: "border-farm-200",
      description: "Scheduled tasks and operational alerts",
    },
    {
      title: "Overdue Items",
      value: summary?.overdue_reminders ?? 0,
      icon: CheckCircle2,
      color: "text-red-700",
      bg: "bg-red-100",
      border: "border-red-200",
      highlight: (summary?.overdue_reminders ?? 0) > 0,
      description: "Passed scheduled deadline",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`rounded-2xl border bg-white p-5 shadow-2xs transition-all hover:shadow-xs ${
              card.highlight ? `${card.border} ring-1 ring-amber-400/30` : "border-earth-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-earth-500 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2 rounded-xl ${card.bg} ${card.color}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-earth-900">
                {isLoading ? (
                  <span className="inline-block h-7 w-12 animate-pulse rounded bg-earth-200" />
                ) : (
                  card.value.toLocaleString()
                )}
              </span>
            </div>

            <p className="mt-1 text-xs text-earth-500">{card.description}</p>
          </div>
        );
      })}
    </div>
  );
}

