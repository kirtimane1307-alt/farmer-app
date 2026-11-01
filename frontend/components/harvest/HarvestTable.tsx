import React from "react";
import { Harvest } from "@/types";
import { HarvestQualityBadge } from "./HarvestQualityBadge";
import {
  Wheat,
  MapPin,
  Calendar,
  Layers,
  Eye,
  Pencil,
  Trash2,
  Warehouse,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui";

interface HarvestTableProps {
  harvests: Harvest[];
  onViewDetails: (harvest: Harvest) => void;
  onEdit: (harvest: Harvest) => void;
  onDelete: (harvest: Harvest) => void;
  loading?: boolean;
}

export function HarvestTable({
  harvests,
  onViewDetails,
  onEdit,
  onDelete,
  loading,
}: HarvestTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-2xs">
        <div className="p-8 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-earth-100/70 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (harvests.length === 0) {
    return null; // EmptyState will be rendered in parent page
  }

  return (
    <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-earth-200 bg-earth-50/75 text-[11px] font-semibold text-earth-600 uppercase tracking-wider">
              <th className="py-3 px-4">Harvest Date</th>
              <th className="py-3 px-4">Crop & Variety</th>
              <th className="py-3 px-4">Farm & Field Plot</th>
              <th className="py-3 px-4 text-right">Yield Quantity</th>
              <th className="py-3 px-4">Quality Grade</th>
              <th className="py-3 px-4">Storage & Batch</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-earth-100 text-sm">
            {harvests.map((h) => {
              const qtyNum = Number(h.quantity || 0);

              return (
                <tr
                  key={h.id}
                  className="hover:bg-earth-50/50 transition-colors group cursor-pointer"
                  onClick={() => onViewDetails(h)}
                >
                  {/* Harvest Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-earth-900 font-medium">
                      <Calendar className="h-4 w-4 text-earth-400" />
                      <span>{h.harvest_date}</span>
                    </div>
                    {h.harvest_method && (
                      <span className="text-[11px] text-earth-500 font-normal ml-5">
                        {h.harvest_method}
                      </span>
                    )}
                  </td>

                  {/* Crop & Variety */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-farm-50 text-farm-700">
                        <Wheat className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-earth-900 block leading-tight">
                          {h.crop_name || "Unknown Crop"}
                        </span>
                        <span className="text-xs text-earth-500">
                          {h.crop_variety || "Standard Variety"}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Farm & Field */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 text-earth-800">
                      <MapPin className="h-3.5 w-3.5 text-earth-400 shrink-0" />
                      <span className="font-medium text-xs truncate max-w-[150px]">
                        {h.farm_name || "Farm"}
                      </span>
                    </div>
                    <span className="text-xs text-earth-500 block ml-5">
                      {h.field_name || "Field Plot"}
                    </span>
                  </td>

                  {/* Quantity & Unit */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="font-bold text-earth-900 font-mono text-base">
                      {qtyNum.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </div>
                    <span className="text-xs font-semibold text-farm-800 uppercase tracking-wide">
                      {h.unit}
                    </span>
                  </td>

                  {/* Quality Grade */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <HarvestQualityBadge grade={h.quality_grade} size="sm" />
                  </td>

                  {/* Storage Location & Batch Number */}
                  <td className="py-3.5 px-4">
                    {h.storage_location ? (
                      <div className="flex items-center gap-1 text-xs text-earth-700">
                        <Warehouse className="h-3 w-3 text-earth-400 shrink-0" />
                        <span className="truncate max-w-[130px]" title={h.storage_location}>
                          {h.storage_location}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-earth-400 italic">No storage logged</span>
                    )}
                    {h.batch_number && (
                      <div className="flex items-center gap-1 text-[11px] text-earth-500 mt-0.5">
                        <Tag className="h-2.5 w-2.5 text-earth-400" />
                        <span className="font-mono">{h.batch_number}</span>
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td
                    className="py-3.5 px-4 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(h)}
                        className="p-1.5 text-earth-500 hover:text-earth-900 hover:bg-earth-100 rounded-lg"
                        title="View Harvest Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(h)}
                        className="p-1.5 text-earth-500 hover:text-harvest-700 hover:bg-harvest-50 rounded-lg"
                        title="Edit Harvest Record"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(h)}
                        className="p-1.5 text-earth-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Delete Harvest Record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
