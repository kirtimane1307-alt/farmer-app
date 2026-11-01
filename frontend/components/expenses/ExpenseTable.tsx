import React from "react";
import { Expense } from "@/types";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { EmptyState } from "@/components/ui";
import {
  Receipt,
  Eye,
  Pencil,
  Trash2,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  Wheat,
} from "lucide-react";

interface ExpenseTableProps {
  expenses: Expense[];
  isLoading?: boolean;
  onViewDetails: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  onRecordPayment: (expense: Expense) => void;
}

export function ExpenseTable({
  expenses,
  isLoading = false,
  onViewDetails,
  onEdit,
  onDelete,
  onRecordPayment,
}: ExpenseTableProps) {
  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-xs p-6">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 bg-earth-50 rounded-lg animate-pulse flex items-center justify-between px-4"
            >
              <div className="h-4 w-32 bg-earth-200 rounded" />
              <div className="h-4 w-20 bg-earth-200 rounded" />
              <div className="h-4 w-16 bg-earth-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No Expenses Matching Criteria"
        description="Try adjusting your filters, search term, or date range, or record a new farm expense."
        phaseBadge="Phase 12"
      />
    );
  }

  return (
    <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs md:text-sm">
          <thead>
            <tr className="bg-earth-50/80 border-b border-earth-200 text-earth-600 font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Expense & Vendor</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Allocation (Farm / Plot)</th>
              <th className="py-3 px-4 text-right">Amount (₹)</th>
              <th className="py-3 px-4 text-right">Paid (₹)</th>
              <th className="py-3 px-4 text-right">Balance Due</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-earth-100 text-earth-800">
            {expenses.map((exp) => {
              const isFullyPaid = exp.payment_status === "paid";
              return (
                <tr
                  key={exp.id}
                  className="hover:bg-earth-50/50 transition-colors group"
                >
                  {/* Date */}
                  <td className="py-3 px-4 whitespace-nowrap text-earth-600 font-medium text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-earth-400" />
                      <span>{formatDate(exp.expense_date)}</span>
                    </div>
                  </td>

                  {/* Title & Vendor */}
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-semibold text-earth-900 leading-snug line-clamp-1">
                      {exp.title}
                    </div>
                    {exp.vendor_name && (
                      <div className="text-[11px] text-earth-500 flex items-center gap-1 mt-0.5">
                        <span className="font-medium text-earth-600">Vendor:</span>
                        <span className="truncate">{exp.vendor_name}</span>
                        {exp.invoice_number && (
                          <span className="text-earth-400">
                            (#{exp.invoice_number})
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <ExpenseCategoryBadge category={exp.category} size="sm" />
                  </td>

                  {/* Allocation (Farm / Plot / Crop) */}
                  <td className="py-3 px-4 whitespace-nowrap text-xs text-earth-600">
                    <div className="flex items-center gap-1 text-earth-800 font-medium">
                      <Building2 className="h-3.5 w-3.5 text-farm-600" />
                      <span className="truncate max-w-[120px]">
                        {exp.farm_name || "General Farm"}
                      </span>
                    </div>
                    {(exp.field_name || exp.crop_name) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-earth-500 mt-0.5">
                        {exp.field_name && (
                          <span className="flex items-center gap-0.5">
                            <Layers className="h-3 w-3 text-earth-400" />
                            {exp.field_name}
                          </span>
                        )}
                        {exp.crop_name && (
                          <span className="flex items-center gap-0.5 text-farm-700">
                            <Wheat className="h-3 w-3 text-farm-500" />
                            {exp.crop_name}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Total Amount */}
                  <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-earth-900 font-mono">
                    {formatInr(exp.amount)}
                  </td>

                  {/* Amount Paid */}
                  <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-emerald-700 font-mono text-xs">
                    {formatInr(exp.amount_paid)}
                  </td>

                  {/* Outstanding Balance */}
                  <td className="py-3 px-4 text-right whitespace-nowrap font-semibold font-mono text-xs">
                    {exp.outstanding_balance > 0 ? (
                      <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        {formatInr(exp.outstanding_balance)}
                      </span>
                    ) : (
                      <span className="text-earth-400">₹0.00</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <ExpenseStatusBadge status={exp.payment_status} size="sm" />
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {/* View details */}
                      <button
                        type="button"
                        onClick={() => onViewDetails(exp)}
                        className="p-1.5 text-earth-500 hover:text-earth-900 hover:bg-earth-100 rounded-md transition-colors"
                        title="View Full Expense & Ledger"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      {/* Record payment (if balance due) */}
                      {!isFullyPaid && (
                        <button
                          type="button"
                          onClick={() => onRecordPayment(exp)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors"
                          title="Record Payment Disbursement"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      )}

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => onEdit(exp)}
                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit Expense"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => onDelete(exp)}
                        className={`p-1.5 rounded-md transition-colors ${
                          exp.amount_paid > 0
                            ? "text-earth-300 cursor-not-allowed hover:bg-transparent"
                            : "text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                        }`}
                        title={
                          exp.amount_paid > 0
                            ? "Cannot delete expense with recorded payments"
                            : "Delete Unpaid Expense"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
