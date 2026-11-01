"use client";

import React from "react";
import { AttendanceDailySummary } from "@/types";
import { Card } from "@/components/ui";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarOff,
  AlertCircle,
  Timer,
} from "lucide-react";

interface AttendanceSummaryCardsProps {
  summary: AttendanceDailySummary | null;
  isLoading?: boolean;
}

export function AttendanceSummaryCards({
  summary,
  isLoading = false,
}: AttendanceSummaryCardsProps) {
  const cards = [
    {
      title: "Active Workforce",
      value: summary?.total_workers ?? 0,
      subtext: "Assigned Workers",
      icon: Users,
      color: "text-earth-700",
      bg: "bg-earth-50",
      border: "border-earth-200",
    },
    {
      title: "Present",
      value: summary?.present ?? 0,
      subtext: "On duty today",
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-50/70",
      border: "border-emerald-200",
    },
    {
      title: "Absent",
      value: summary?.absent ?? 0,
      subtext: "Unexcused absence",
      icon: XCircle,
      color: "text-red-700",
      bg: "bg-red-50/70",
      border: "border-red-200",
    },
    {
      title: "Half Day",
      value: summary?.half_day ?? 0,
      subtext: "Partial shifts",
      icon: Clock,
      color: "text-amber-700",
      bg: "bg-amber-50/70",
      border: "border-amber-200",
    },
    {
      title: "On Leave",
      value: summary?.leave ?? 0,
      subtext: "Approved leave",
      icon: CalendarOff,
      color: "text-indigo-700",
      bg: "bg-indigo-50/70",
      border: "border-indigo-200",
    },
    {
      title: "Hours Logged",
      value: summary?.total_working_hours_formatted ?? "0h",
      subtext: summary?.total_overtime_minutes
        ? `+${summary.total_overtime_hours_formatted} OT`
        : "Standard shift",
      icon: Timer,
      color: "text-farm-800",
      bg: "bg-farm-50/80",
      border: "border-farm-200",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card
            key={idx}
            className={`p-3.5 border ${card.border} ${card.bg} rounded-xl shadow-2xs transition-all`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-earth-600 truncate">
                {card.title}
              </span>
              <Icon className={`h-4 w-4 ${card.color} shrink-0`} />
            </div>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className={`text-xl font-bold tracking-tight ${card.color}`}>
                {isLoading ? "..." : card.value}
              </span>
            </div>
            <p className="text-[10px] text-earth-500 mt-0.5 truncate">
              {card.subtext}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
