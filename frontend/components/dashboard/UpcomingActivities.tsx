"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  AlertCircle,
  CalendarCheck,
} from "lucide-react";
import { DashboardUpcomingActivity } from "@/lib/api/dashboard";

interface UpcomingActivitiesProps {
  activities: DashboardUpcomingActivity[];
  isLoading?: boolean;
}

export function UpcomingActivities({
  activities,
  isLoading = false,
}: UpcomingActivitiesProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-farm-600 border-t-transparent animate-spin mb-2" />
        <span className="text-xs text-earth-500">Loading upcoming farm calendar events...</span>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 p-6 shadow-2xs h-80 flex flex-col items-center justify-center text-center">
        <div className="p-3 bg-earth-100 rounded-full text-earth-400 mb-2">
          <CalendarCheck className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-earth-800">
          No Impending Activities
        </h4>
        <p className="text-xs text-earth-500 max-w-sm mt-1 mb-3">
          All farm calendar tasks are up to date. Schedule irrigation, spraying, or harvest operations in the Farm Calendar.
        </p>
        <Link
          href="/calendar"
          className="text-xs font-semibold text-farm-700 bg-farm-50 hover:bg-farm-100 border border-farm-200 px-3 py-1.5 rounded-lg inline-flex items-center gap-1 transition-colors"
        >
          <span>Open Farm Calendar</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const formatEventDate = (dtStr: string) => {
    try {
      const d = new Date(dtStr);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dtStr;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case "critical":
      case "high":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-earth-100 text-earth-700 border-earth-200";
    }
  };

  return (
    <div className="space-y-3">
      <div className="divide-y divide-earth-100 max-h-[320px] overflow-y-auto pr-1">
        {activities.map((act) => (
          <div
            key={act.id}
            className="py-2.5 flex items-start justify-between gap-3 hover:bg-earth-50/50 rounded-lg px-2 -mx-2 transition-colors"
          >
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-earth-900 truncate">
                  {act.title}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider ${getPriorityBadge(
                    act.priority
                  )}`}
                >
                  {act.priority || "Normal"}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-earth-500 flex-wrap">
                <div className="flex items-center gap-1 text-earth-600">
                  <Clock className="h-3 w-3 text-farm-600" />
                  <span>{formatEventDate(act.start_datetime)}</span>
                </div>

                {(act.farm_name || act.field_name) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-earth-400" />
                    <span>
                      {act.farm_name}
                      {act.field_name ? ` • ${act.field_name}` : ""}
                    </span>
                  </div>
                )}

                {act.crop_name && (
                  <span className="text-earth-600 font-medium">
                    Crop: {act.crop_name}
                  </span>
                )}
              </div>
            </div>

            <span className="text-[10px] capitalize font-medium text-earth-500 bg-earth-100 px-2 py-0.5 rounded">
              {act.status?.replace("_", " ") || "scheduled"}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-earth-100 flex items-center justify-between">
        <span className="text-[11px] text-earth-500">
          Showing next {activities.length} impending activities
        </span>
        <Link
          href="/calendar"
          className="text-xs font-medium text-farm-700 hover:text-farm-800 flex items-center gap-1 hover:underline"
        >
          <span>View Full Calendar</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default UpcomingActivities;
