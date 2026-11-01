"use client";

import React from "react";
import Link from "next/link";
import { Labour } from "@/types";
import { Badge, Button } from "@/components/ui";
import {
  IndianRupee,
  Briefcase,
  Tractor,
  Phone,
  Calendar,
  Edit,
  UserX,
  Eye,
} from "lucide-react";

interface LabourTableProps {
  labours: Labour[];
  onEdit: (labour: Labour) => void;
  onDeactivate: (labour: Labour) => void;
}

export function LabourTable({
  labours,
  onEdit,
  onDeactivate,
}: LabourTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-earth-200 bg-white shadow-2xs">
      <table className="w-full text-left text-sm text-earth-800">
        <thead className="bg-earth-50/80 text-[11px] font-semibold uppercase tracking-wider text-earth-500 border-b border-earth-200">
          <tr>
            <th scope="col" className="px-4 py-3.5">Worker Name</th>
            <th scope="col" className="px-4 py-3.5">Assigned Farm</th>
            <th scope="col" className="px-4 py-3.5">Work Role</th>
            <th scope="col" className="px-4 py-3.5">Daily Wage</th>
            <th scope="col" className="px-4 py-3.5">Contact Phone</th>
            <th scope="col" className="px-4 py-3.5">Joining Date</th>
            <th scope="col" className="px-4 py-3.5">Status</th>
            <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-earth-100">
          {labours.map((worker) => {
            const isActive = worker.status === "active";
            const formattedDate = new Date(worker.joining_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <tr
                key={worker.id}
                className="hover:bg-earth-50/50 transition-colors duration-150"
              >
                {/* Worker Name */}
                <td className="px-4 py-3.5 font-medium text-earth-900 whitespace-nowrap">
                  <Link
                    href={`/labour/${worker.id}`}
                    className="hover:text-farm-700 transition-colors font-semibold"
                  >
                    {worker.name}
                  </Link>
                </td>

                {/* Farm */}
                <td className="px-4 py-3.5 text-xs text-earth-600 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Tractor className="h-3.5 w-3.5 text-earth-400 shrink-0" />
                    <span>{worker.farm_name || "Assigned Farm"}</span>
                  </div>
                </td>

                {/* Work Type */}
                <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                  <div className="inline-flex items-center gap-1 text-farm-800 font-medium bg-farm-50 px-2 py-0.5 rounded-md border border-farm-100">
                    <Briefcase className="h-3 w-3 text-farm-600 shrink-0" />
                    <span>{worker.work_type}</span>
                  </div>
                </td>

                {/* Daily Wage */}
                <td className="px-4 py-3.5 text-xs font-bold text-earth-900 whitespace-nowrap">
                  <span className="inline-flex items-center">
                    <IndianRupee className="h-3.5 w-3.5 text-farm-600 mr-0.5" />
                    ₹{Number(worker.daily_wage).toLocaleString()}
                    <span className="text-[10px] font-normal text-earth-500 ml-1">/day</span>
                  </span>
                </td>

                {/* Phone */}
                <td className="px-4 py-3.5 text-xs text-earth-600 whitespace-nowrap">
                  {worker.phone ? (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-earth-400 shrink-0" />
                      <a
                        href={`tel:${worker.phone}`}
                        className="hover:text-farm-700 transition-colors font-mono"
                      >
                        {worker.phone}
                      </a>
                    </div>
                  ) : (
                    <span className="text-earth-400 italic text-[11px]">—</span>
                  )}
                </td>

                {/* Joining Date */}
                <td className="px-4 py-3.5 text-xs text-earth-600 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-earth-400 shrink-0" />
                    <span>{formattedDate}</span>
                  </div>
                </td>

                {/* Status */}
                <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                  <Badge variant={isActive ? "success" : "neutral"} size="sm">
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>

                {/* Actions */}
                <td className="px-4 py-3.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <Link href={`/labour/${worker.id}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 text-earth-500 hover:text-earth-900"
                        title="View profile"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="sr-only">View</span>
                      </Button>
                    </Link>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(worker)}
                      className="h-7 w-7 p-0 text-earth-600 hover:text-earth-900"
                      title="Edit worker"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeactivate(worker)}
                      className="h-7 w-7 p-0 text-amber-700 hover:bg-amber-50 border-amber-200"
                      title={isActive ? "Deactivate worker" : "Manage status"}
                    >
                      <UserX className="h-3.5 w-3.5" />
                      <span className="sr-only">Deactivate</span>
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
