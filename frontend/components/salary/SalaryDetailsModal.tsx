"use client";

import React, { useState, useEffect } from "react";
import { SalaryRecord } from "@/types";
import { salaryApi } from "@/lib/api/salary";
import { SalaryStatusBadge } from "./SalaryStatusBadge";
import { Modal, Button } from "@/components/ui";
import {
  User,
  MapPin,
  Calendar,
  IndianRupee,
  Receipt,
  Clock,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
} from "lucide-react";

interface SalaryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  salary: SalaryRecord | null;
  onDisbursePayment?: (salary: SalaryRecord) => void;
}

export function SalaryDetailsModal({
  isOpen,
  onClose,
  salary: initialSalary,
  onDisbursePayment,
}: SalaryDetailsModalProps) {
  const [currentSalary, setCurrentSalary] = useState<SalaryRecord | null>(initialSalary);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCurrentSalary(initialSalary);
    if (isOpen && initialSalary?.id) {
      // Refresh latest data including payment list
      setIsLoading(true);
      salaryApi.getSalaryById(initialSalary.id).then((res) => {
        setIsLoading(false);
        if (res.data) {
          setCurrentSalary(res.data);
        }
      });
    }
  }, [isOpen, initialSalary]);

  if (!currentSalary) return null;

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val ?? 0);
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

  const isFullySettled =
    currentSalary.status === "paid" || Number(currentSalary.outstanding_balance) <= 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Salary Ledger & Disbursement Breakdown"
      description="Historical payroll record, frozen attendance snapshot, and disbursement history."
      size="lg"
    >
      <div className="space-y-5 py-1">
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-earth-50 rounded-xl border border-earth-200">
          <div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-farm-600" />
              <h3 className="font-bold text-earth-900 text-sm">{currentSalary.labour_name || "Worker"}</h3>
              <SalaryStatusBadge status={currentSalary.status} size="sm" />
            </div>
            <div className="flex items-center gap-3 text-xs text-earth-500 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-earth-400" />
                {currentSalary.farm_name || "Farm"}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-earth-400" />
                {formatDate(currentSalary.period_start)} – {formatDate(currentSalary.period_end)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-earth-500 block">Balance Due</span>
            <span
              className={`text-xl font-black ${
                Number(currentSalary.outstanding_balance) > 0 ? "text-amber-700" : "text-emerald-700"
              }`}
            >
              {formatCurrency(currentSalary.outstanding_balance)}
            </span>
          </div>
        </div>

        {/* Attendance Units Breakdown */}
        <div className="p-3.5 bg-white rounded-xl border border-earth-200/90 shadow-2xs space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-earth-700 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-farm-600" />
            Attendance Metrics Snapshot
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
            <div className="p-2 bg-emerald-50/60 rounded-lg border border-emerald-100">
              <span className="text-[10px] text-emerald-700 block">Present Days</span>
              <span className="font-bold text-emerald-900">{currentSalary.present_days}</span>
            </div>
            <div className="p-2 bg-amber-50/60 rounded-lg border border-amber-100">
              <span className="text-[10px] text-amber-700 block">Half Days (0.5x)</span>
              <span className="font-bold text-amber-900">{currentSalary.half_days}</span>
            </div>
            <div className="p-2 bg-red-50/60 rounded-lg border border-red-100">
              <span className="text-[10px] text-red-700 block">Absent Days</span>
              <span className="font-bold text-red-900">{currentSalary.absent_days}</span>
            </div>
            <div className="p-2 bg-indigo-50/60 rounded-lg border border-indigo-100">
              <span className="text-[10px] text-indigo-700 block">Leave Days</span>
              <span className="font-bold text-indigo-900">{currentSalary.leave_days}</span>
            </div>
            <div className="p-2 bg-earth-100/60 rounded-lg border border-earth-200">
              <span className="text-[10px] text-earth-700 block">Payable Units</span>
              <span className="font-black text-earth-900">{currentSalary.payable_units} days</span>
            </div>
          </div>
        </div>

        {/* Financial Components Ledger */}
        <div className="p-3.5 bg-white rounded-xl border border-earth-200/90 shadow-2xs space-y-2 text-xs">
          <h4 className="font-bold uppercase tracking-wider text-earth-700 flex items-center gap-1.5 mb-2">
            <Receipt className="h-3.5 w-3.5 text-farm-600" />
            Wage Calculation Ledger
          </h4>

          <div className="flex justify-between py-1 border-b border-earth-100 text-earth-700">
            <span>Daily Wage Snapshot:</span>
            <span className="font-semibold text-earth-900">{formatCurrency(currentSalary.daily_wage_snapshot)}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-earth-100 text-earth-700">
            <span>Regular Salary ({currentSalary.payable_units} units × {formatCurrency(currentSalary.daily_wage_snapshot)}):</span>
            <span className="font-semibold text-earth-900">{formatCurrency(currentSalary.regular_salary)}</span>
          </div>

          {Number(currentSalary.overtime_pay) > 0 && (
            <div className="flex justify-between py-1 border-b border-earth-100 text-sky-700">
              <span>+ Approved Overtime Pay:</span>
              <span className="font-semibold">{formatCurrency(currentSalary.overtime_pay)}</span>
            </div>
          )}

          {Number(currentSalary.additional_earnings) > 0 && (
            <div className="flex justify-between py-1 border-b border-earth-100 text-emerald-700">
              <span>+ Additional Earnings / Bonuses:</span>
              <span className="font-semibold">{formatCurrency(currentSalary.additional_earnings)}</span>
            </div>
          )}

          <div className="flex justify-between py-1 border-b border-earth-100 text-earth-800 font-medium">
            <span>Gross Salary:</span>
            <span>{formatCurrency(currentSalary.gross_salary)}</span>
          </div>

          {Number(currentSalary.deductions) > 0 && (
            <div className="flex justify-between py-1 border-b border-earth-100 text-red-600">
              <span>- Deductions / Advances:</span>
              <span className="font-semibold">-{formatCurrency(currentSalary.deductions)}</span>
            </div>
          )}

          <div className="flex justify-between py-1.5 text-sm font-bold text-earth-900">
            <span>Net Payable Wages:</span>
            <span className="text-farm-700 text-base">{formatCurrency(currentSalary.net_salary)}</span>
          </div>
        </div>

        {/* Disbursement & Payment History */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-earth-700 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-farm-600" />
              Disbursement History ({currentSalary.payments?.length || 0})
            </h4>

            {!isFullySettled && onDisbursePayment && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onDisbursePayment(currentSalary);
                }}
                className="h-7 text-xs bg-farm-50 hover:bg-farm-100 text-farm-700 border-farm-200 flex items-center gap-1"
              >
                <IndianRupee className="h-3 w-3" />
                Record Payment
              </Button>
            )}
          </div>

          {currentSalary.payments && currentSalary.payments.length > 0 ? (
            <div className="border border-earth-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-earth-50 text-earth-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-100 text-earth-800">
                  {currentSalary.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-earth-50/50">
                      <td className="py-2 px-3 whitespace-nowrap font-medium text-earth-900">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="py-2 px-3 font-bold text-emerald-700">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-2 px-3 capitalize text-earth-700">
                        {p.payment_method.replace(/_/g, " ")}
                      </td>
                      <td className="py-2 px-3 text-earth-500 font-mono text-[11px]">
                        {p.transaction_reference || "-"}
                      </td>
                      <td className="py-2 px-3 text-earth-500 truncate max-w-xs">
                        {p.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 text-center rounded-xl border border-dashed border-earth-200 bg-earth-50/50 text-xs text-earth-500">
              No payments have been disbursed against this salary record yet.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-earth-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
