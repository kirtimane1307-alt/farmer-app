"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Card, Button, Input, Select } from "@/components/ui";
import { labourApi } from "@/lib/api/labour";
import { farmsApi } from "@/lib/api/farms";
import { Farm, LabourCreatePayload, LabourStatus } from "@/types";
import {
  User,
  Phone,
  MapPin,
  Briefcase,
  IndianRupee,
  Calendar,
  FileText,
  AlertCircle,
  ArrowLeft,
  Tractor,
} from "lucide-react";

const WORK_TYPES = [
  "General Labour",
  "Tractor Operator",
  "Irrigation Worker",
  "Harvest Worker",
  "Field Worker",
  "Other",
];

export default function NewLabourPage() {
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoadingFarms, setIsLoadingFarms] = useState(true);

  // Form inputs
  const [farmId, setFarmId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [workType, setWorkType] = useState("General Labour");
  const [dailyWage, setDailyWage] = useState("500");
  const [joiningDate, setJoiningDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [status, setStatus] = useState<LabourStatus>("active");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFarms() {
      try {
        const res = await farmsApi.getFarms();
        if (res.data) {
          setFarms(res.data);
          if (res.data.length > 0) {
            setFarmId(res.data[0].id);
          }
        }
      } catch {
        setError("Failed to load farms list.");
      } finally {
        setIsLoadingFarms(false);
      }
    }
    loadFarms();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setError("Worker full name is required.");
      return;
    }

    if (!farmId) {
      setError("Please select a farm estate for this worker.");
      return;
    }

    const wageNum = parseFloat(dailyWage);
    if (isNaN(wageNum) || wageNum < 0) {
      setError("Daily wage must be a non-negative number.");
      return;
    }

    if (!joiningDate) {
      setError("Joining date is required.");
      return;
    }

    // Optional phone validation
    if (phone.trim()) {
      const digits = phone.replace(/[\s\-\(\)\+]/g, "");
      if (digits.length < 7 || digits.length > 15) {
        setError("Phone number must contain between 7 and 15 digits.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const payload: LabourCreatePayload = {
        farm_id: farmId,
        name: cleanName,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        work_type: workType.trim() || "General Labour",
        daily_wage: wageNum,
        joining_date: joiningDate,
        status,
        notes: notes.trim() || undefined,
      };

      const res = await labourApi.createLabour(payload, farmId);
      if (res.error) {
        setError(res.error || "Failed to create worker.");
      } else if (res.data) {
        router.push("/labour");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Add Farm Labour"
        description="Register a new farm worker, establish their daily wage agreement, and assign them to an agricultural landholding."
        badge="Phase 7"
        breadcrumbs={[
          { label: "Workforce", href: "/labour" },
          { label: "Labour", href: "/labour" },
          { label: "New Worker" },
        ]}
        actions={
          <Link href="/labour">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Roster
            </Button>
          </Link>
        }
      />

      <div className="max-w-3xl mx-auto py-2">
        <Card className="p-6 bg-white border-earth-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Farm Selection */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1.5">
                Assigned Farm Estate <span className="text-red-500">*</span>
              </label>
              <select
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                required
                disabled={isLoadingFarms || farms.length === 0}
                className="w-full text-sm rounded-lg border border-earth-300 bg-white px-3 py-2 text-earth-900 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600 disabled:bg-earth-100"
              >
                {farms.length === 0 ? (
                  <option value="" disabled>
                    {isLoadingFarms ? "Loading farms..." : "No farms available — create a farm first"}
                  </option>
                ) : (
                  farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.location}) — {Number(f.total_area).toLocaleString()} {f.area_unit}
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-earth-500 mt-1">
                Workers are scoped to an owned farm estate and strictly isolated to your user account.
              </p>
            </div>

            {/* Name and Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Worker Full Name *"
                placeholder="e.g. Ramesh Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                leftIcon={<User className="h-4 w-4 text-earth-400" />}
              />

              <Input
                label="Contact Phone"
                placeholder="e.g. +91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="h-4 w-4 text-earth-400" />}
                helperText="Indian mobile format (+91 or 10 digits)"
              />
            </div>

            {/* Work Trade and Daily Wage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1.5">
                  Work Role / Trade <span className="text-red-500">*</span>
                </label>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  className="w-full text-sm rounded-lg border border-earth-300 bg-white px-3 py-2 text-earth-900 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
                >
                  {WORK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Daily Wage (₹) *"
                type="number"
                min="0"
                step="10"
                placeholder="e.g. 500"
                value={dailyWage}
                onChange={(e) => setDailyWage(e.target.value)}
                required
                leftIcon={<IndianRupee className="h-4 w-4 text-earth-400" />}
                helperText="Fixed daily compensation rate per shift"
              />
            </div>

            {/* Joining Date and Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Employment Joining Date *"
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                required
                leftIcon={<Calendar className="h-4 w-4 text-earth-400" />}
              />

              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1.5">
                  Employment Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LabourStatus)}
                  className="w-full text-sm rounded-lg border border-earth-300 bg-white px-3 py-2 text-earth-900 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
                >
                  <option value="active">Active (Available for daily muster roll)</option>
                  <option value="inactive">Inactive (On leave or unassigned)</option>
                </select>
              </div>
            </div>

            {/* Address */}
            <Input
              label="Residential / Village Address"
              placeholder="e.g. Village Rampur, Tehsil 2"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              leftIcon={<MapPin className="h-4 w-4 text-earth-400" />}
            />

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1.5">
                Notes / Special Skills / Qualifications
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Certified in tractor operation, skilled in sprayer nozzles..."
                className="w-full text-xs rounded-lg border border-earth-300 bg-white p-3 text-earth-900 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600 resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-earth-100">
              <Link href="/labour">
                <Button type="button" variant="outline" size="sm" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
                Save Labour Record
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
