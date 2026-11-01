"use client";

import React from "react";
import Link from "next/link";
import { Labour } from "@/types";
import { Modal, Button, Badge } from "@/components/ui";
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  IndianRupee,
  Calendar,
  Tractor,
  FileText,
  Clock,
  Edit,
  UserX,
  ExternalLink,
} from "lucide-react";

interface LabourDetailsModalProps {
  isOpen: boolean;
  labour: Labour | null;
  onClose: () => void;
  onEdit: (labour: Labour) => void;
  onDeactivate: (labour: Labour) => void;
}

export function LabourDetailsModal({
  isOpen,
  labour,
  onClose,
  onEdit,
  onDeactivate,
}: LabourDetailsModalProps) {
  if (!labour) return null;

  const isActive = labour.status === "active";
  const joiningDateFormatted = new Date(labour.joining_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const recordCreatedFormatted = new Date(labour.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Worker Profile Details"
      description={`ID: ${labour.id.slice(0, 8)}... — Agricultural workforce registry`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Link href={`/labour/${labour.id}`}>
            <Button variant="outline" size="sm" className="text-xs">
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Full Page Profile
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(labour);
              }}
            >
              <Edit className="h-3.5 w-3.5 mr-1" />
              Edit
            </Button>
            <Button
              variant={isActive ? "secondary" : "primary"}
              size="sm"
              onClick={() => {
                onClose();
                onDeactivate(labour);
              }}
            >
              <UserX className="h-3.5 w-3.5 mr-1" />
              {isActive ? "Deactivate" : "Manage Status"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Profile Header */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-earth-50 border border-earth-200">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-farm-600 text-white flex items-center justify-center font-bold text-base shadow-2xs">
              {labour.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h4 className="font-bold text-earth-900 text-base">{labour.name}</h4>
              <p className="text-xs text-earth-500 font-medium">{labour.work_type}</p>
            </div>
          </div>
          <Badge variant={isActive ? "success" : "neutral"} size="md">
            {isActive ? "Active Worker" : "Inactive"}
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl border border-earth-200 bg-white shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-earth-400 tracking-wider">
              Daily Wage Rate
            </span>
            <div className="flex items-center text-farm-800 font-extrabold text-lg">
              <IndianRupee className="h-4 w-4 mr-0.5 text-farm-600" />
              ₹{Number(labour.daily_wage).toLocaleString()}
              <span className="text-xs font-normal text-earth-500 ml-1">/ day</span>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-earth-200 bg-white shadow-2xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-earth-400 tracking-wider">
              Assigned Estate
            </span>
            <div className="flex items-center text-earth-900 font-bold text-sm truncate">
              <Tractor className="h-4 w-4 mr-1 text-earth-500 shrink-0" />
              <span className="truncate">{labour.farm_name || "Farm"}</span>
            </div>
          </div>
        </div>

        {/* Detailed Information Rows */}
        <div className="space-y-2.5 text-xs text-earth-700 bg-earth-50/50 p-3.5 rounded-xl border border-earth-200">
          <div className="flex items-center justify-between py-1 border-b border-earth-100">
            <span className="text-earth-500 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-earth-400" />
              Contact Phone:
            </span>
            <span className="font-semibold text-earth-900">
              {labour.phone ? (
                <a href={`tel:${labour.phone}`} className="hover:text-farm-700 font-mono">
                  {labour.phone}
                </a>
              ) : (
                <span className="text-earth-400 italic">Not provided</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-earth-100">
            <span className="text-earth-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-earth-400" />
              Joining Date:
            </span>
            <span className="font-semibold text-earth-900">{joiningDateFormatted}</span>
          </div>

          <div className="flex items-start justify-between py-1 border-b border-earth-100">
            <span className="text-earth-500 flex items-center gap-1.5 shrink-0">
              <MapPin className="h-3.5 w-3.5 text-earth-400" />
              Address:
            </span>
            <span className="font-medium text-earth-900 text-right max-w-xs">
              {labour.address || <span className="text-earth-400 italic">Not provided</span>}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-earth-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-earth-400" />
              Enrolled Since:
            </span>
            <span className="text-earth-700">{recordCreatedFormatted}</span>
          </div>
        </div>

        {/* Remarks and Notes */}
        {labour.notes && (
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-earth-800 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900">
              <FileText className="h-3.5 w-3.5 text-amber-700" />
              <span>Administrative Notes</span>
            </div>
            <p className="text-earth-700 italic leading-relaxed pl-5">{labour.notes}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
