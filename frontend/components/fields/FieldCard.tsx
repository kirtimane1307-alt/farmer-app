"use client";

import React from "react";
import { Field } from "@/types";
import { Card, Badge } from "@/components/ui";
import { Edit, Trash2, Droplets, Mountain, FileText, Maximize2 } from "lucide-react";

interface FieldCardProps {
  field: Field;
  onEdit: (field: Field) => void;
  onDelete: (field: Field) => void;
}

export function FieldCard({ field, onEdit, onDelete }: FieldCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-earth-200 flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header with Title and Area */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-semibold text-earth-900 text-base leading-tight">
              {field.name}
            </h4>
            <div className="flex items-center text-xs text-earth-600 mt-1 gap-1">
              <Maximize2 className="h-3.5 w-3.5 text-farm-600 shrink-0" />
              <span className="font-medium text-earth-800">
                {Number(field.area).toLocaleString()} {field.area_unit}
              </span>
            </div>
          </div>
          <Badge variant="outline" size="sm" className="bg-farm-50 text-farm-800 border-farm-200">
            Active Plot
          </Badge>
        </div>

        {/* Badges for Soil and Irrigation */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {field.soil_type ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <Mountain className="h-3 w-3 shrink-0 text-amber-600" />
              <span>{field.soil_type}</span>
            </span>
          ) : (
            <span className="inline-flex items-center text-xs text-earth-400 italic">
              Soil unclassified
            </span>
          )}

          {field.irrigation_type ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200">
              <Droplets className="h-3 w-3 shrink-0 text-blue-600" />
              <span>{field.irrigation_type}</span>
            </span>
          ) : (
            <span className="inline-flex items-center text-xs text-earth-400 italic">
              Rainfed / Unspecified
            </span>
          )}
        </div>

        {/* Notes / Description */}
        {field.description && (
          <div className="flex items-start gap-1.5 text-xs text-earth-600 bg-earth-50/60 p-2.5 rounded-lg border border-earth-100">
            <FileText className="h-3.5 w-3.5 text-earth-400 shrink-0 mt-0.5" />
            <p className="line-clamp-2 leading-relaxed">{field.description}</p>
          </div>
        )}
      </div>

      {/* Card Actions */}
      <div className="mt-4 pt-3 border-t border-earth-100 flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => onEdit(field)}
          className="p-1.5 rounded-lg text-earth-500 hover:text-earth-800 hover:bg-earth-100 transition-colors"
          title="Edit field plot"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(field)}
          className="p-1.5 rounded-lg text-earth-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          title="Delete field plot"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
