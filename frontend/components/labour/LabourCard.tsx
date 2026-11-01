"use client";

import React from "react";
import Link from "next/link";
import { Labour } from "@/types";
import { Card, Button, Badge } from "@/components/ui";
import {
  Phone,
  Calendar,
  MapPin,
  Tractor,
  Briefcase,
  IndianRupee,
  Edit,
  UserX,
  Eye,
  FileText,
} from "lucide-react";

interface LabourCardProps {
  labour: Labour;
  onEdit: (labour: Labour) => void;
  onDeactivate: (labour: Labour) => void;
  onView?: (labour: Labour) => void;
}

export function LabourCard({
  labour,
  onEdit,
  onDeactivate,
  onView,
}: LabourCardProps) {
  const formattedJoiningDate = new Date(labour.joining_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const isActive = labour.status === "active";

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-earth-200 flex flex-col justify-between">
      <div className="space-y-3.5">
        {/* Header with Name, Work Type and Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-earth-900 text-lg leading-tight hover:text-farm-700 transition-colors">
              <Link href={`/labour/${labour.id}`}>{labour.name}</Link>
            </h3>
            <div className="flex items-center text-xs text-earth-600 gap-1.5">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-earth-400" />
              <span className="font-medium text-farm-800">{labour.work_type}</span>
            </div>
          </div>
          <Badge variant={isActive ? "success" : "neutral"} size="sm">
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Wage & Farm Metric Pills */}
        <div className="grid grid-cols-2 gap-2 py-2.5 px-3 bg-earth-50/80 rounded-xl border border-earth-100 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-farm-100/70 text-farm-700 shrink-0">
              <IndianRupee className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-earth-500 block text-[10px] uppercase tracking-wider font-semibold">
                Daily Wage
              </span>
              <span className="font-bold text-earth-900 text-sm">
                ₹{Number(labour.daily_wage).toLocaleString()}
                <span className="text-[10px] font-normal text-earth-500"> /day</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-earth-200/60 text-earth-700 shrink-0">
              <Tractor className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-earth-500 block text-[10px] uppercase tracking-wider font-semibold">
                Assigned Farm
              </span>
              <span className="font-semibold text-earth-900 truncate block text-xs" title={labour.farm_name || "Estate"}>
                {labour.farm_name || "Farm Estate"}
              </span>
            </div>
          </div>
        </div>

        {/* Contact & Meta Details */}
        <div className="space-y-1.5 text-xs text-earth-600 pt-0.5">
          {labour.phone ? (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-earth-400 shrink-0" />
              <a
                href={`tel:${labour.phone}`}
                className="hover:text-farm-700 font-medium transition-colors text-earth-700"
              >
                {labour.phone}
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-earth-400 italic text-[11px]">
              <Phone className="h-3.5 w-3.5 text-earth-300 shrink-0" />
              <span>No phone recorded</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-earth-400 shrink-0" />
            <span>Joined on {formattedJoiningDate}</span>
          </div>

          {labour.address && (
            <div className="flex items-center gap-2 truncate">
              <MapPin className="h-3.5 w-3.5 text-earth-400 shrink-0" />
              <span className="truncate" title={labour.address}>{labour.address}</span>
            </div>
          )}

          {labour.notes && (
            <div className="flex items-start gap-2 pt-1 text-[11px] text-earth-500 line-clamp-2">
              <FileText className="h-3 w-3 text-earth-400 mt-0.5 shrink-0" />
              <span className="italic">{labour.notes}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="pt-4 mt-4 border-t border-earth-100 flex items-center justify-between gap-2">
        <Link href={`/labour/${labour.id}`}>
          <Button variant="outline" size="sm" className="text-xs h-8 px-2.5">
            <Eye className="h-3.5 w-3.5 mr-1 text-earth-500" />
            Profile
          </Button>
        </Link>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(labour)}
            className="text-xs h-8 px-2.5"
            title="Edit worker profile"
          >
            <Edit className="h-3.5 w-3.5 text-earth-600" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeactivate(labour)}
            className="text-xs h-8 px-2.5 text-amber-700 hover:bg-amber-50 hover:text-amber-800 border-amber-200"
            title={isActive ? "Deactivate worker" : "Manage status"}
          >
            <UserX className="h-3.5 w-3.5 text-amber-600" />
            <span className="sr-only sm:not-sr-only sm:ml-1">
              {isActive ? "Deactivate" : "Status"}
            </span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
