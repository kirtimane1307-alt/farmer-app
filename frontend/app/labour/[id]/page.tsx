"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Card, Button, Badge } from "@/components/ui";
import {
  LabourFormModal,
  DeactivateLabourDialog,
} from "@/components/labour";
import { labourApi } from "@/lib/api/labour";
import { farmsApi } from "@/lib/api/farms";
import { attendanceApi } from "@/lib/api/attendance";
import { AttendanceStatusBadge, AttendanceFormModal } from "@/components/attendance";
import { Labour, Farm, Attendance } from "@/types";
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
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  CalendarCheck,
  Plus,
  Timer,
  LogIn,
  LogOut,
} from "lucide-react";

export default function LabourDetailPage() {
  const params = useParams();
  const router = useRouter();
  const labourId = params.id as string;

  const [labour, setLabour] = useState<Labour | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!labourId) return;
    setIsLoading(true);
    setError(null);

    try {
      const [labourRes, farmsRes, attRes] = await Promise.all([
        labourApi.getLabourById(labourId),
        farmsApi.getFarms(),
        attendanceApi.getWorkerAttendance(labourId),
      ]);

      if (labourRes.error) {
        setError(labourRes.error || "Failed to load worker details.");
      } else if (labourRes.data) {
        setLabour(labourRes.data);
      }

      if (farmsRes.data) {
        setFarms(farmsRes.data);
      }

      if (attRes.data) {
        setAttendances(attRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading worker profile.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [labourId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEditSuccess = (updatedLabour: Labour) => {
    setLabour(updatedLabour);
  };

  const handleDeactivateSuccess = (result: Labour | { id: string; deleted: boolean }) => {
    if ("deleted" in result && result.deleted) {
      router.push("/labour");
    } else {
      setLabour(result as Labour);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-farm-600" />
          <p className="text-sm font-medium text-earth-600">Loading worker profile...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !labour) {
    return (
      <DashboardLayout>
        <div className="p-8 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3 max-w-md mx-auto my-16">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto" />
          <h3 className="text-base font-semibold text-red-900">Worker Not Found</h3>
          <p className="text-xs text-red-700">
            {error || "The requested worker profile could not be found or you do not have permission to view it."}
          </p>
          <Link href="/labour">
            <Button variant="outline" size="sm" className="mt-2">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Workforce
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isActive = labour.status === "active";
  const joiningDateFormatted = new Date(labour.joining_date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const createdDateFormatted = new Date(labour.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <DashboardLayout>
      <PageHeader
        title={labour.name}
        description={`Agricultural Worker Profile • ${labour.work_type}`}
        badge={isActive ? "Active Duty" : "Inactive"}
        breadcrumbs={[
          { label: "Workforce", href: "/labour" },
          { label: "Labour", href: "/labour" },
          { label: labour.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/labour">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back to Roster
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="h-3.5 w-3.5 mr-1.5" />
              Edit Profile
            </Button>
            <Button
              variant={isActive ? "outline" : "primary"}
              size="sm"
              onClick={() => setIsDeactivateDialogOpen(true)}
              className={isActive ? "text-amber-700 hover:bg-amber-50 border-amber-200" : ""}
            >
              <UserX className="h-3.5 w-3.5 mr-1.5" />
              {isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Worker Summary Card */}
        <div className="space-y-6 lg:col-span-1">
          <Card className="p-6 bg-white border-earth-200 shadow-2xs space-y-5">
            {/* Avatar & Identification */}
            <div className="text-center space-y-2">
              <div className="h-20 w-20 rounded-full bg-farm-600 text-white flex items-center justify-center font-bold text-2xl shadow-md mx-auto">
                {labour.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-earth-900">{labour.name}</h2>
                <p className="text-xs font-semibold text-farm-800">{labour.work_type}</p>
              </div>
              <Badge variant={isActive ? "success" : "neutral"} size="md">
                {isActive ? "Active Member" : "Inactive Member"}
              </Badge>
            </div>

            {/* Quick Metrics */}
            <div className="space-y-3 pt-3 border-t border-earth-100">
              <div className="flex items-center justify-between p-3 rounded-xl bg-earth-50 border border-earth-100">
                <span className="text-xs font-medium text-earth-600">Daily Wage</span>
                <span className="text-base font-extrabold text-earth-900 flex items-center">
                  <IndianRupee className="h-4 w-4 text-farm-600 mr-0.5" />
                  ₹{Number(labour.daily_wage).toLocaleString()}
                  <span className="text-xs font-normal text-earth-500 ml-1">/day</span>
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-earth-50 border border-earth-100">
                <span className="text-xs font-medium text-earth-600">Assigned Farm</span>
                <Link
                  href={`/farms/${labour.farm_id}`}
                  className="text-xs font-bold text-farm-700 hover:text-farm-900 flex items-center gap-1"
                >
                  <Tractor className="h-3.5 w-3.5" />
                  <span className="truncate max-w-[130px]">{labour.farm_name || "View Farm"}</span>
                </Link>
              </div>
            </div>

            {/* Contact Actions */}
            {labour.phone && (
              <div className="pt-2">
                <a
                  href={`tel:${labour.phone}`}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-farm-50 text-farm-800 hover:bg-farm-100 border border-farm-200 text-xs font-semibold transition-colors"
                >
                  <Phone className="h-3.5 w-3.5" />
                  Call Worker ({labour.phone})
                </a>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Detailed Information */}
        <div className="space-y-6 lg:col-span-2">
          {/* Employment & Personal Profile */}
          <Card className="p-6 bg-white border-earth-200 shadow-2xs space-y-5">
            <h3 className="font-semibold text-earth-900 text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-farm-600" />
              Employment Information & Record Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-earth-50/70 border border-earth-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-earth-400 tracking-wider">
                  Full Name
                </span>
                <p className="font-semibold text-earth-900 text-sm">{labour.name}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-earth-50/70 border border-earth-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-earth-400 tracking-wider">
                  Work Role / Trade
                </span>
                <p className="font-semibold text-farm-800 text-sm">{labour.work_type}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-earth-50/70 border border-earth-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-earth-400 tracking-wider">
                  Daily Wage Agreement
                </span>
                <p className="font-semibold text-earth-900 text-sm">
                  ₹{Number(labour.daily_wage).toLocaleString()} INR per work day
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-earth-50/70 border border-earth-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-earth-400 tracking-wider">
                  Employment Joining Date
                </span>
                <p className="font-semibold text-earth-900 text-sm">{joiningDateFormatted}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-earth-50/70 border border-earth-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-earth-400 tracking-wider">
                  Phone Number
                </span>
                <p className="font-semibold text-earth-900 text-sm">
                  {labour.phone || <span className="text-earth-400 italic">None recorded</span>}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-earth-50/70 border border-earth-100 space-y-1">
                <span className="text-[10px] uppercase font-bold text-earth-400 tracking-wider">
                  Assigned Farm Holding
                </span>
                <p className="font-semibold text-earth-900 text-sm">
                  {labour.farm_name || "Estate ID: " + labour.farm_id.slice(0, 8)}
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="p-3.5 rounded-xl bg-earth-50/70 border border-earth-100 space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-earth-400 tracking-wider">
                Residential / Village Address
              </span>
              <p className="font-medium text-earth-900">
                {labour.address || <span className="text-earth-400 italic">No address recorded</span>}
              </p>
            </div>

            {/* Notes */}
            {labour.notes && (
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <span>Administrative Remarks & Skills</span>
                </div>
                <p className="text-earth-800 italic leading-relaxed pt-1">{labour.notes}</p>
              </div>
            )}

            {/* System Metadata */}
            <div className="pt-3 border-t border-earth-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-earth-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-farm-600" />
                <span>Tenant ownership strictly verified via PostgreSQL</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-earth-400" />
                <span>Enrolled on {createdDateFormatted}</span>
              </div>
            </div>
          </Card>

          {/* Section: Worker Attendance & Working Hours History (Phase 8) */}
          <Card className="p-6 bg-white border-earth-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-farm-50 text-farm-700 flex items-center justify-center">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-earth-900 text-sm">
                    Attendance & Working Hours History
                  </h3>
                  <p className="text-[11px] text-earth-500">
                    Chronological shift attendance logs, check-in/out records, and overtime.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAttendanceModalOpen(true)}
                className="text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Log Attendance
              </Button>
            </div>

            {/* Attendance Quick Stats */}
            {attendances.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                <div className="p-2.5 rounded-lg bg-earth-50 border border-earth-100">
                  <span className="text-[10px] text-earth-400 font-bold uppercase">Total Shifts</span>
                  <div className="text-base font-bold text-earth-900">{attendances.length}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase">Present Days</span>
                  <div className="text-base font-bold text-emerald-800">
                    {attendances.filter((a) => a.status === "present").length}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-100">
                  <span className="text-[10px] text-red-600 font-bold uppercase">Absences</span>
                  <div className="text-base font-bold text-red-800">
                    {attendances.filter((a) => a.status === "absent").length}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-farm-50 border border-farm-100">
                  <span className="text-[10px] text-farm-600 font-bold uppercase">Total Hours Logged</span>
                  <div className="text-base font-bold text-farm-800">
                    {Math.round(attendances.reduce((acc, a) => acc + (a.working_minutes || 0), 0) / 60)}h
                  </div>
                </div>
              </div>
            )}

            {/* Attendance Records Table */}
            {attendances.length === 0 ? (
              <div className="py-8 text-center space-y-2 border border-dashed border-earth-200 rounded-xl bg-earth-50/50">
                <CalendarCheck className="h-8 w-8 text-earth-400 mx-auto" />
                <p className="text-xs font-semibold text-earth-700">No Attendance Records Yet</p>
                <p className="text-[11px] text-earth-500 max-w-sm mx-auto">
                  Log this worker&apos;s daily check-in and check-out to calculate accurate working hours and overtime.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="mt-2 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Log First Attendance
                </Button>
              </div>
            ) : (
              <div className="border border-earth-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-earth-50 border-b border-earth-100 text-earth-600 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Check-In</th>
                      <th className="py-2.5 px-3">Check-Out</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Overtime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-earth-100 text-earth-800">
                    {attendances.slice(0, 10).map((att) => (
                      <tr key={att.id} className="hover:bg-earth-50/50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-earth-900">
                          {att.attendance_date}
                        </td>
                        <td className="py-2 px-3">
                          <AttendanceStatusBadge status={att.status} size="sm" />
                        </td>
                        <td className="py-2 px-3 text-earth-600">
                          {att.check_in ? att.check_in.slice(0, 5) : "--"}
                        </td>
                        <td className="py-2 px-3 text-earth-600">
                          {att.check_out ? att.check_out.slice(0, 5) : "--"}
                        </td>
                        <td className="py-2 px-3 font-bold text-earth-900">
                          {att.working_hours_formatted || "0h"}
                        </td>
                        <td className="py-2 px-3">
                          {att.overtime_minutes > 0 ? (
                            <span className="text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                              +{att.overtime_hours_formatted}
                            </span>
                          ) : (
                            <span className="text-earth-400">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <LabourFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        labourToEdit={labour}
        farms={farms}
      />

      {/* Deactivate / Delete Dialog */}
      <DeactivateLabourDialog
        isOpen={isDeactivateDialogOpen}
        onClose={() => setIsDeactivateDialogOpen(false)}
        onSuccess={handleDeactivateSuccess}
        labour={labour}
      />

      {/* Log Attendance Modal for this Worker */}
      <AttendanceFormModal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        onSuccess={() => loadData()}
        workers={labour ? [labour] : []}
        defaultLabourId={labourId}
      />
    </DashboardLayout>
  );
}
