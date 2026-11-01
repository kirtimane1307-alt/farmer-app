"use client";

import React from "react";
import { AgriculturalApplication } from "@/types";
import { ApplicationCategoryBadge } from "./ApplicationCategoryBadge";
import { Modal, Button } from "@/components/ui";
import {
  Calendar,
  MapPin,
  Wheat,
  IndianRupee,
  Layers,
  Pencil,
  Info,
  ShieldAlert,
} from "lucide-react";

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: AgriculturalApplication | null;
  onEdit?: (app: AgriculturalApplication) => void;
}

export function ApplicationDetailsModal({
  isOpen,
  onClose,
  application,
  onEdit,
}: ApplicationDetailsModalProps) {
  if (!application) return null;

  const formatCurrency = (val?: number | null) => {
    if (val === null || val === undefined) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agricultural Application Record"
      description="Nutrient dosage details, crop protection spray metrics, and expenditure ledger."
      size="md"
    >
      <div className="space-y-4 py-1">
        {/* Header Banner */}
        <div className="p-4 bg-earth-50 rounded-xl border border-earth-200 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-base text-earth-900">{application.product_name}</h3>
              <p className="text-xs text-earth-600 capitalize">
                {application.product_type} {application.application_method && `· ${application.application_method.replace(/_/g, " ")}`}
              </p>
            </div>
            <ApplicationCategoryBadge category={application.application_category} size="md" />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-earth-200/80 text-xs text-earth-500">
            <Calendar className="h-3.5 w-3.5 text-earth-400" />
            <span>Applied on {formatDate(application.application_date)}</span>
          </div>
        </div>

        {/* Location & Crop Context */}
        <div className="p-3.5 bg-white rounded-xl border border-earth-200 space-y-2 text-xs">
          <h4 className="font-bold uppercase tracking-wider text-earth-700 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-farm-600" />
            Application Target Location
          </h4>

          <div className="grid grid-cols-2 gap-2 text-earth-800">
            <div>
              <span className="text-[10px] text-earth-400 uppercase block">Farm Estate</span>
              <span className="font-semibold text-earth-900">{application.farm_name || "—"}</span>
            </div>
            <div>
              <span className="text-[10px] text-earth-400 uppercase block">Field Plot</span>
              <span className="font-semibold text-earth-900">{application.field_name || "—"}</span>
            </div>
          </div>

          {application.crop_name && (
            <div className="pt-2 border-t border-earth-100 flex items-center gap-1.5 text-emerald-800 font-medium">
              <Wheat className="h-4 w-4 text-emerald-600" />
              <span>Target Crop: {application.crop_name}</span>
              {application.crop_variety && <span className="text-earth-500">({application.crop_variety})</span>}
            </div>
          )}
        </div>

        {/* Dosage & Financial Expenditure */}
        <div className="p-3.5 bg-white rounded-xl border border-earth-200 space-y-2 text-xs">
          <h4 className="font-bold uppercase tracking-wider text-earth-700 flex items-center gap-1.5">
            <IndianRupee className="h-3.5 w-3.5 text-farm-600" />
            Dosage & Expenditure Ledger
          </h4>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 bg-earth-50 rounded-lg border border-earth-100">
              <span className="text-[10px] text-earth-500 uppercase block">Quantity</span>
              <span className="font-bold text-earth-900 text-sm">
                {application.quantity} {application.unit}
              </span>
            </div>

            <div className="p-2 bg-earth-50 rounded-lg border border-earth-100">
              <span className="text-[10px] text-earth-500 uppercase block">Unit Price</span>
              <span className="font-semibold text-earth-700 text-sm">
                {formatCurrency(application.unit_cost)}
              </span>
            </div>

            <div className="p-2 bg-earth-50 rounded-lg border border-earth-100">
              <span className="text-[10px] text-earth-500 uppercase block">Total Cost</span>
              <span className="font-black text-earth-900 text-sm">
                {formatCurrency(application.total_cost)}
              </span>
            </div>
          </div>
        </div>

        {/* Target Purpose & Notes */}
        {(application.purpose || application.notes) && (
          <div className="p-3.5 bg-white rounded-xl border border-earth-200 space-y-2 text-xs">
            {application.purpose && (
              <div>
                <span className="font-semibold text-earth-700 block">Target Nutrient / Pest Objective:</span>
                <p className="text-earth-600 mt-0.5">{application.purpose}</p>
              </div>
            )}
            {application.notes && (
              <div className="pt-2 border-t border-earth-100">
                <span className="font-semibold text-earth-700 block">Administrative Notes & Safety Precautions:</span>
                <p className="text-earth-600 mt-0.5">{application.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-earth-100">
          {onEdit ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(application);
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Record
            </Button>
          ) : <div />}

          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
