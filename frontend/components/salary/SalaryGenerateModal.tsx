"use client";

import React, { useState, useEffect } from "react";
import { Labour, Farm, SalaryPreviewResponse } from "@/types";
import { salaryApi } from "@/lib/api/salary";
import { Modal, Button, Input, Select } from "@/components/ui";
import {
  Calculator,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  IndianRupee,
  ShieldCheck,
  FileText,
  User,
} from "lucide-react";

interface SalaryGenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSalaryCreated: () => void;
  labourList: Labour[];
  farms: Farm[];
}

export function SalaryGenerateModal({
  isOpen,
  onClose,
  onSalaryCreated,
  labourList,
  farms,
}: SalaryGenerateModalProps) {
  const [selectedLabourId, setSelectedLabourId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [overtimePay, setOvertimePay] = useState<number | string>(0);
  const [additionalEarnings, setAdditionalEarnings] = useState<number | string>(0);
  const [deductions, setDeductions] = useState<number | string>(0);
  const [notes, setNotes] = useState("");

  const [preview, setPreview] = useState<SalaryPreviewResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Default to current month start and current date
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const toISO = (d: Date) => d.toISOString().split("T")[0];

      setPeriodStart(toISO(firstDay));
      setPeriodEnd(toISO(today));
      setPreview(null);
      setErrorMsg(null);
      setSuccessMsg(null);
      setOvertimePay(0);
      setAdditionalEarnings(0);
      setDeductions(0);
      setNotes("");

      if (labourList.length > 0 && !selectedLabourId) {
        setSelectedLabourId(labourList[0].id);
      }
    }
  }, [isOpen, labourList]);

  const selectedWorker = labourList.find((l) => l.id === selectedLabourId);

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val ?? 0);
  };

  const handleFetchPreview = async () => {
    if (!selectedLabourId) {
      setErrorMsg("Please select a labourer.");
      return;
    }
    if (!periodStart || !periodEnd) {
      setErrorMsg("Please provide both start and end dates for the salary period.");
      return;
    }
    if (periodEnd < periodStart) {
      setErrorMsg("Period end date cannot be earlier than start date.");
      return;
    }

    setIsPreviewLoading(true);
    setErrorMsg(null);
    setPreview(null);

    const res = await salaryApi.previewSalary({
      labour_id: selectedLabourId,
      period_start: periodStart,
      period_end: periodEnd,
      approved_overtime_pay: Number(overtimePay) || 0,
      additional_earnings: Number(additionalEarnings) || 0,
      deductions: Number(deductions) || 0,
      notes: notes.trim() || undefined,
    });

    setIsPreviewLoading(false);

    if (res.error) {
      setErrorMsg(res.error || "Failed to calculate salary preview.");
    } else if (res.data) {
      setPreview(res.data);
    }
  };

  const handleSaveSalary = async () => {
    if (!selectedLabourId || !periodStart || !periodEnd) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await salaryApi.createSalary({
      labour_id: selectedLabourId,
      period_start: periodStart,
      period_end: periodEnd,
      approved_overtime_pay: Number(overtimePay) || 0,
      additional_earnings: Number(additionalEarnings) || 0,
      deductions: Number(deductions) || 0,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error || "Failed to save salary record.");
    } else {
      setSuccessMsg("Official salary record generated and saved successfully!");
      setTimeout(() => {
        onSalaryCreated();
        onClose();
      }, 1000);
    }
  };

  const workerOptions = labourList.map((l) => ({
    value: l.id,
    label: `${l.name} · ${l.work_type || "General"} (₹${l.daily_wage || 0}/day)`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Salary Record"
      description="Calculate authoritative wages using verified attendance records and freeze a permanent ledger snapshot."
      size="xl"
    >
      <div className="space-y-5 py-1">
        {/* Alerts */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Worker Selector */}
          <div className="space-y-1">
            <label className="block text-xs font-medium text-earth-700">Labourer</label>
            <Select
              options={workerOptions}
              value={selectedLabourId}
              onChange={(e) => {
                setSelectedLabourId(e.target.value);
                setPreview(null);
              }}
              placeholder="Select labourer..."
              className="text-xs"
            />
            {selectedWorker && (
              <p className="text-[11px] text-earth-500">
                Current Daily Wage: <span className="font-semibold text-earth-800">₹{selectedWorker.daily_wage || 0}</span>
              </p>
            )}
          </div>

          {/* Period Range */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-earth-700">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => {
                  setPeriodStart(e.target.value);
                  setPreview(null);
                }}
                className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-earth-700">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => {
                  setPeriodEnd(e.target.value);
                  setPreview(null);
                }}
                className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
              />
            </div>
          </div>
        </div>

        {/* Adjustments row: Overtime Pay, Additional Earnings, Deductions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-earth-50 rounded-lg border border-earth-100">
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Approved Overtime (₹)
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={overtimePay}
              onChange={(e) => {
                setOvertimePay(e.target.value);
                setPreview(null);
              }}
              placeholder="0.00"
              className="block w-full rounded-lg border border-earth-300 px-3 py-1.5 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
            <span className="text-[10px] text-earth-500">Explicit overtime compensation</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Bonuses / Allowances (₹)
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={additionalEarnings}
              onChange={(e) => {
                setAdditionalEarnings(e.target.value);
                setPreview(null);
              }}
              placeholder="0.00"
              className="block w-full rounded-lg border border-earth-300 px-3 py-1.5 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
            <span className="text-[10px] text-earth-500">Festival bonus or incentives</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Deductions / Advances (₹)
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={deductions}
              onChange={(e) => {
                setDeductions(e.target.value);
                setPreview(null);
              }}
              placeholder="0.00"
              className="block w-full rounded-lg border border-earth-300 px-3 py-1.5 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
            <span className="text-[10px] text-earth-500">Wage advances or loans</span>
          </div>
        </div>

        {/* Administrative Notes */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">
            Administrative Notes (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Month-end wage settlement with seasonal harvesting bonus"
            className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
          />
        </div>

        {/* Calculate Preview Button */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFetchPreview}
            disabled={isPreviewLoading}
            className="px-4 text-xs font-semibold flex items-center gap-1.5 border-earth-300 hover:bg-earth-100"
          >
            <Calculator className="h-3.5 w-3.5 text-farm-600" />
            {isPreviewLoading ? "Calculating Breakdown..." : "Calculate Salary Preview"}
          </Button>
        </div>

        {/* Step 2: Authoritative Preview Card */}
        {preview && (
          <div className="mt-4 p-4 rounded-xl border border-earth-200 bg-linear-to-b from-earth-50/60 to-white space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-earth-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-earth-800">
                  Authoritative Backend Breakdown
                </h4>
              </div>
              <span className="text-xs font-semibold text-earth-700">
                Daily Wage Snapshot: <span className="text-farm-700">{formatCurrency(preview.daily_wage_snapshot)}</span>
              </span>
            </div>

            {/* Attendance Units Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 bg-white rounded-lg border border-earth-100">
                <span className="text-[10px] text-earth-500 block">Present Days</span>
                <span className="font-bold text-emerald-700 text-sm">{preview.attendance.present_days}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-earth-100">
                <span className="text-[10px] text-earth-500 block">Half Days (0.5x)</span>
                <span className="font-bold text-amber-700 text-sm">{preview.attendance.half_days}</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-earth-100">
                <span className="text-[10px] text-earth-500 block">Payable Units</span>
                <span className="font-bold text-earth-900 text-sm">{preview.attendance.payable_units} days</span>
              </div>
              <div className="p-2 bg-white rounded-lg border border-earth-100">
                <span className="text-[10px] text-earth-500 block">Logged Overtime</span>
                <span className="font-bold text-sky-700 text-sm">{preview.attendance.total_overtime_hours_formatted}</span>
              </div>
            </div>

            {/* Financial Ledger Calculation */}
            <div className="bg-white p-3.5 rounded-lg border border-earth-200/90 space-y-2 text-xs">
              <div className="flex justify-between text-earth-700">
                <span>Regular Salary ({preview.attendance.payable_units} units × {formatCurrency(preview.daily_wage_snapshot)}):</span>
                <span className="font-semibold text-earth-900">{formatCurrency(preview.regular_salary)}</span>
              </div>

              {Number(preview.approved_overtime_pay) > 0 && (
                <div className="flex justify-between text-sky-700">
                  <span>+ Approved Overtime Pay:</span>
                  <span className="font-semibold">{formatCurrency(preview.approved_overtime_pay)}</span>
                </div>
              )}

              {Number(preview.additional_earnings) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>+ Additional Earnings / Bonuses:</span>
                  <span className="font-semibold">{formatCurrency(preview.additional_earnings)}</span>
                </div>
              )}

              <div className="flex justify-between text-earth-800 font-medium pt-1 border-t border-dashed border-earth-200">
                <span>Gross Payable Wages:</span>
                <span>{formatCurrency(preview.gross_salary)}</span>
              </div>

              {Number(preview.deductions) > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>- Advances / Deductions:</span>
                  <span className="font-semibold">-{formatCurrency(preview.deductions)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-bold text-earth-900 pt-2 border-t border-earth-200">
                <span>Net Authoritative Salary Due:</span>
                <span className="text-farm-700 text-base">{formatCurrency(preview.net_salary)}</span>
              </div>
            </div>

            {/* Warning if already generated */}
            {preview.is_already_generated && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Notice: A salary record has already been generated for this worker covering this exact period. Generating a duplicate is prevented to protect ledger integrity.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-earth-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>

          {preview && !preview.is_already_generated && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSalary}
              disabled={isSubmitting}
              className="bg-farm-600 hover:bg-farm-700 text-white font-semibold flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? "Generating Ledger..." : "Confirm & Save Salary"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
