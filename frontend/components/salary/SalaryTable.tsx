"use client";

import React from "react";
import { SalaryRecord } from "@/types";
import { SalaryStatusBadge } from "./SalaryStatusBadge";
import { Button, Card, EmptyState } from "@/components/ui";
import {
  CreditCard,
  Eye,
  Trash2,
  Calendar,
  IndianRupee,
  User,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface SalaryTableProps {
  salaries: SalaryRecord[];
  isLoading?: boolean;
  onViewDetails: (salary: SalaryRecord) => void;
  onRecordPayment: (salary: SalaryRecord) => void;
  onDeleteSalary: (salary: SalaryRecord) => void;
  onGenerateNew: () => void;
}

export function SalaryTable({
  salaries,
  isLoading = false,
  onViewDetails,
  onRecordPayment,
  onDeleteSalary,
  onGenerateNew,
}: SalaryTableProps) {
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

  if (salaries.length === 0) {
    return (
      <EmptyState
        icon={CreditCard}
        title="No Salary Records Found"
        description="No salary ledger records match your current filter criteria. You can generate a new salary calculation for any worker."
        actionLabel="Calculate & Generate Salary"
        onAction={onGenerateNew}
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
              <th className="py-3 px-4">Labourer & Estate</th>
              <th className="py-3 px-4">Salary Period</th>
              <th className="py-3 px-4 text-center">Attendance Units</th>
              <th className="py-3 px-4 text-right">Daily Wage</th>
              <th className="py-3 px-4 text-right">Net Payable</th>
              <th className="py-3 px-4 text-right">Paid</th>
              <th className="py-3 px-4 text-right">Outstanding</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-earth-100 text-earth-800">
            {salaries.map((sal) => {
              const isSettled = sal.status === "paid" || Number(sal.outstanding_balance) <= 0;
              const hasDisbursements = Number(sal.amount_paid) > 0 || (sal.payments && sal.payments.length > 0);

              return (
                <tr
                  key={sal.id}
                  className="hover:bg-earth-50/60 transition-colors group"
                >
                  {/* Labourer & Estate */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-earth-900 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-earth-400" />
                      {sal.labour_name || "Worker"}
                    </div>
                    <div className="text-[11px] text-earth-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-earth-400" />
                      {sal.farm_name || "Farm Estate"}
                    </div>
                  </td>

                  {/* Period */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1 font-medium text-earth-800">
                      <Calendar className="h-3.5 w-3.5 text-earth-400" />
                      <span>{formatDate(sal.period_start)}</span>
                    </div>
                    <div className="text-[11px] text-earth-500 pl-4.5">
                      to {formatDate(sal.period_end)}
                    </div>
                  </td>

                  {/* Attendance Units */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {sal.payable_units} days
                    </span>
                    <div className="text-[10px] text-earth-500 mt-1">
                      {sal.present_days}P · {sal.half_days}H · {sal.absent_days}A · {sal.leave_days}L
                    </div>
                  </td>

                  {/* Daily Wage */}
                  <td className="py-3.5 px-4 text-right font-medium text-earth-700">
                    {formatCurrency(sal.daily_wage_snapshot)}
                    <div className="text-[10px] text-earth-400">Snapshot</div>
                  </td>

                  {/* Net Payable */}
                  <td className="py-3.5 px-4 text-right font-bold text-earth-900">
                    {formatCurrency(sal.net_salary)}
                    {Number(sal.deductions) > 0 && (
                      <div className="text-[10px] text-red-500 font-normal">
                        -₹{sal.deductions} ded.
                      </div>
                    )}
                  </td>

                  {/* Amount Paid */}
                  <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">
                    {formatCurrency(sal.amount_paid)}
                  </td>

                  {/* Outstanding Balance */}
                  <td className="py-3.5 px-4 text-right font-bold">
                    <span
                      className={
                        Number(sal.outstanding_balance) > 0
                          ? "text-amber-700"
                          : "text-earth-400"
                      }
                    >
                      {formatCurrency(sal.outstanding_balance)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4 text-center">
                    <SalaryStatusBadge status={sal.status} size="sm" />
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {/* View Details */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(sal)}
                        className="h-8 w-8 p-0 text-earth-600 hover:text-earth-900 hover:bg-earth-100"
                        title="View Ledger & Breakdown"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Record Payment */}
                      {!isSettled ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onRecordPayment(sal)}
                          className="h-8 px-2.5 text-xs bg-farm-600 hover:bg-farm-700 text-white shadow-2xs flex items-center gap-1"
                          title="Record Wage Disbursement"
                        >
                          <IndianRupee className="h-3 w-3" />
                          Pay
                        </Button>
                      ) : (
                        <span className="inline-flex items-center text-xs text-emerald-600 px-2 py-1 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Paid
                        </span>
                      )}

                      {/* Delete (only if zero payments recorded) */}
                      {!hasDisbursements && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteSalary(sal)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                          title="Delete Unpaid Salary"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden divide-y divide-earth-200">
        {salaries.map((sal) => {
          const isSettled = sal.status === "paid" || Number(sal.outstanding_balance) <= 0;
          const hasDisbursements = Number(sal.amount_paid) > 0 || (sal.payments && sal.payments.length > 0);

          return (
            <div key={sal.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-earth-900 text-sm flex items-center gap-1.5">
                    <User className="h-4 w-4 text-farm-600" />
                    {sal.labour_name || "Worker"}
                  </h4>
                  <p className="text-xs text-earth-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-earth-400" />
                    {sal.farm_name || "Farm"}
                  </p>
                </div>
                <SalaryStatusBadge status={sal.status} size="sm" />
              </div>

              {/* Period & Attendance */}
              <div className="flex items-center justify-between text-xs text-earth-600 bg-earth-50 p-2.5 rounded-lg border border-earth-100">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-earth-400" />
                  <span>
                    {formatDate(sal.period_start)} – {formatDate(sal.period_end)}
                  </span>
                </div>
                <span className="font-semibold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full text-[11px]">
                  {sal.payable_units} Units
                </span>
              </div>

              {/* Financial Figures */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-earth-100 text-xs">
                <div>
                  <span className="text-[10px] text-earth-500 uppercase tracking-wider block">Net Due</span>
                  <span className="font-bold text-earth-900">{formatCurrency(sal.net_salary)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-earth-500 uppercase tracking-wider block">Disbursed</span>
                  <span className="font-semibold text-emerald-700">{formatCurrency(sal.amount_paid)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-earth-500 uppercase tracking-wider block">Balance</span>
                  <span className={`font-bold ${Number(sal.outstanding_balance) > 0 ? "text-amber-700" : "text-earth-400"}`}>
                    {formatCurrency(sal.outstanding_balance)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-earth-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDetails(sal)}
                  className="h-8 text-xs flex items-center gap-1"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Details
                </Button>

                {!isSettled && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onRecordPayment(sal)}
                    className="h-8 text-xs bg-farm-600 hover:bg-farm-700 text-white flex items-center gap-1"
                  >
                    <IndianRupee className="h-3 w-3" />
                    Pay Wage
                  </Button>
                )}

                {!hasDisbursements && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteSalary(sal)}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
