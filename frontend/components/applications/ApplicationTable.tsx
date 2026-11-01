"use client";

import React from "react";
import { AgriculturalApplication } from "@/types";
import { ApplicationCategoryBadge } from "./ApplicationCategoryBadge";
import { Button, Card, EmptyState } from "@/components/ui";
import {
  FlaskConical,
  Bug,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  IndianRupee,
  MapPin,
  Wheat,
} from "lucide-react";

interface ApplicationTableProps {
  applications: AgriculturalApplication[];
  isLoading?: boolean;
  onViewDetails: (app: AgriculturalApplication) => void;
  onEdit: (app: AgriculturalApplication) => void;
  onDelete: (app: AgriculturalApplication) => void;
  onAddNew: () => void;
  defaultCategory?: string;
}

export function ApplicationTable({
  applications,
  isLoading = false,
  onViewDetails,
  onEdit,
  onDelete,
  onAddNew,
  defaultCategory,
}: ApplicationTableProps) {
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

  if (isLoading) {
    return (
      <Card className="p-6 bg-white border border-earth-200">
        <div className="space-y-4">
          <div className="h-6 w-48 bg-earth-200/60 rounded-sm animate-pulse" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 w-full bg-earth-100/70 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (applications.length === 0) {
    const isPest = defaultCategory === "pesticide";
    return (
      <EmptyState
        icon={isPest ? Bug : FlaskConical}
        title={isPest ? "No Pesticide Applications Found" : "No Fertilizer Applications Found"}
        description={
          isPest
            ? "Record your protective sprays, chemical dosage, targeted pests, and safety intervals."
            : "Track organic compost and chemical nutrient dosages applied across your farm plots."
        }
        actionLabel={isPest ? "Log Pesticide Spray" : "Log Fertilizer Application"}
        onAction={onAddNew}
      />
    );
  }

  return (
    <Card className="overflow-hidden bg-white border border-earth-200/80 shadow-2xs">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-earth-50/80 border-b border-earth-200/80 text-earth-600 font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Date & Category</th>
              <th className="py-3 px-4">Product & Classification</th>
              <th className="py-3 px-4">Plot & Target Crop</th>
              <th className="py-3 px-4 text-center">Dosage / Quantity</th>
              <th className="py-3 px-4 text-right">Unit Price</th>
              <th className="py-3 px-4 text-right">Total Expenditure</th>
              <th className="py-3 px-4">Purpose / Target</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-earth-100 text-earth-800">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-earth-50/60 transition-colors group">
                {/* Date & Category */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="font-semibold text-earth-900 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-earth-400" />
                    {formatDate(app.application_date)}
                  </div>
                  <div className="mt-1">
                    <ApplicationCategoryBadge category={app.application_category} size="sm" />
                  </div>
                </td>

                {/* Product & Classification */}
                <td className="py-3.5 px-4">
                  <div className="font-bold text-earth-900">{app.product_name}</div>
                  <div className="text-[11px] text-earth-500 capitalize">
                    {app.product_type} {app.application_method && `· ${app.application_method}`}
                  </div>
                </td>

                {/* Location & Crop */}
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-1 text-earth-900 font-medium">
                    <MapPin className="h-3 w-3 text-farm-600" />
                    <span>{app.field_name || "Field Plot"}</span>
                    <span className="text-[10px] text-earth-400">({app.farm_name})</span>
                  </div>
                  {app.crop_name && (
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 mt-0.5 font-medium">
                      <Wheat className="h-3 w-3" />
                      <span>{app.crop_name}</span>
                      {app.crop_variety && <span className="text-earth-400">({app.crop_variety})</span>}
                    </div>
                  )}
                </td>

                {/* Dosage */}
                <td className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-earth-100 text-earth-800 border border-earth-200">
                    {app.quantity} {app.unit}
                  </span>
                </td>

                {/* Unit Cost */}
                <td className="py-3.5 px-4 text-right text-earth-600 font-medium">
                  {formatCurrency(app.unit_cost)}
                  {app.unit_cost !== null && app.unit_cost !== undefined && (
                    <span className="text-[10px] text-earth-400 block">per {app.unit}</span>
                  )}
                </td>

                {/* Total Cost */}
                <td className="py-3.5 px-4 text-right">
                  <span className="font-bold text-earth-900 text-sm">
                    {formatCurrency(app.total_cost)}
                  </span>
                </td>

                {/* Purpose */}
                <td className="py-3.5 px-4 max-w-xs truncate text-earth-600">
                  {app.purpose || <span className="text-earth-400 italic">None specified</span>}
                </td>

                {/* Actions */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(app)}
                      className="h-8 w-8 p-0 text-earth-600 hover:text-earth-900 hover:bg-earth-100"
                      title="View Application Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(app)}
                      className="h-8 w-8 p-0 text-earth-600 hover:text-earth-900 hover:bg-earth-100"
                      title="Edit Application"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(app)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                      title="Delete Application"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden divide-y divide-earth-200">
        {applications.map((app) => (
          <div key={app.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-earth-900 text-sm">{app.product_name}</h4>
                <p className="text-xs text-earth-500 capitalize">
                  {app.product_type} · {formatDate(app.application_date)}
                </p>
              </div>
              <ApplicationCategoryBadge category={app.application_category} size="sm" />
            </div>

            <div className="flex items-center justify-between text-xs text-earth-600 bg-earth-50 p-2.5 rounded-lg border border-earth-100">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-farm-600" />
                <span>
                  {app.field_name} ({app.farm_name})
                </span>
              </div>
              <span className="font-bold text-earth-800 bg-white px-2 py-0.5 rounded-md border border-earth-200">
                {app.quantity} {app.unit}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-earth-100">
              <div className="text-earth-600">
                <span>Total Expenditure: </span>
                <span className="font-bold text-earth-900 text-sm">{formatCurrency(app.total_cost)}</span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(app)}
                  className="h-7 text-xs px-2"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(app)}
                  className="h-7 text-xs px-2"
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(app)}
                  className="h-7 w-7 p-0 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
