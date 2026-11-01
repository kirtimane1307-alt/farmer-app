"use client";

import React from "react";
import Link from "next/link";
import { Farm } from "@/types";
import { Card, Button, Badge } from "@/components/ui";
import { MapPin, Maximize2, Layers, Calendar, Edit, Trash2, ArrowRight } from "lucide-react";

interface FarmCardProps {
  farm: Farm;
  onEdit: (farm: Farm) => void;
  onDelete: (farm: Farm) => void;
}

export function FarmCard({ farm, onEdit, onDelete }: FarmCardProps) {
  const formattedDate = new Date(farm.created_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-earth-200 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header with Title and Unit Badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-earth-900 text-lg leading-tight hover:text-farm-700 transition-colors">
              <Link href={`/farms/${farm.id}`}>{farm.name}</Link>
            </h3>
            <div className="flex items-center text-xs text-earth-500 mt-1 gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-earth-400" />
              <span className="truncate">{farm.location}</span>
            </div>
          </div>
          <Badge variant="success" size="sm">
            Active
          </Badge>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 py-3 px-3.5 bg-earth-50/70 rounded-xl border border-earth-100 text-xs">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-farm-100/60 text-farm-700">
              <Maximize2 className="h-4 w-4" />
            </div>
            <div>
              <span className="text-earth-500 block text-[10px] uppercase tracking-wider font-semibold">Total Area</span>
              <span className="font-semibold text-earth-900">
                {Number(farm.total_area).toLocaleString()} {farm.area_unit}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-earth-200/60 text-earth-700">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <span className="text-earth-500 block text-[10px] uppercase tracking-wider font-semibold">Field Plots</span>
              <span className="font-semibold text-earth-900">
                {farm.field_count ?? 0} {farm.field_count === 1 ? "Plot" : "Plots"}
              </span>
            </div>
          </div>
        </div>

        {/* Created Date */}
        <div className="flex items-center text-[11px] text-earth-400 gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          <span>Registered on {formattedDate}</span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="mt-5 pt-3.5 border-t border-earth-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onEdit(farm)}
            className="p-1.5 rounded-lg text-earth-500 hover:text-earth-800 hover:bg-earth-100 transition-colors"
            title="Edit farm details"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(farm)}
            className="p-1.5 rounded-lg text-earth-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete farm"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <Link href={`/farms/${farm.id}`}>
          <Button variant="outline" size="sm" className="text-xs group">
            <span>Manage Fields</span>
            <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
