import React from "react";
import { Expense } from "@/types";
import { Modal, Button } from "@/components/ui";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import {
  Building2,
  Layers,
  Wheat,
  Calendar,
  CreditCard,
  Receipt,
  FileText,
  Clock,
  Pencil,
  CheckCircle2,
} from "lucide-react";

interface ExpenseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onEdit?: (expense: Expense) => void;
  onRecordPayment?: (expense: Expense) => void;
}

export function ExpenseDetailsModal({
  isOpen,
  onClose,
  expense,
  onEdit,
  onRecordPayment,
}: ExpenseDetailsModalProps) {
  if (!expense) return null;

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

  const isFullyPaid = expense.payment_status === "paid";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={expense.title}
      description={`Expense record #${expense.id.slice(0, 8)}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* Top Badges & Financial Highlights */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-earth-50 rounded-xl border border-earth-200">
          <div className="flex items-center gap-2">
            <ExpenseCategoryBadge category={expense.category} size="md" />
            <ExpenseStatusBadge status={expense.payment_status} size="md" />
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-earth-500 block">
              Total Incurred
            </span>
            <span className="text-xl font-bold font-mono text-earth-900">
              {formatInr(expense.amount)}
            </span>
          </div>
        </div>

        {/* Financial Breakdown Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-white border border-earth-200 rounded-lg text-center shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-earth-500 block">
              Total Amount
            </span>
            <span className="text-base font-bold font-mono text-earth-900">
              {formatInr(expense.amount)}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-emerald-700 block">
              Paid to Date
            </span>
            <span className="text-base font-bold font-mono text-emerald-800">
              {formatInr(expense.amount_paid)}
            </span>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-center shadow-2xs">
            <span className="text-[10px] uppercase font-semibold text-rose-700 block">
              Outstanding Due
            </span>
            <span className="text-base font-bold font-mono text-rose-800">
              {formatInr(expense.outstanding_balance)}
            </span>
          </div>
        </div>

        {/* Operational Context & Allocation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2.5 p-3.5 bg-white border border-earth-200 rounded-xl">
            <div className="font-semibold text-earth-900 border-b border-earth-100 pb-1.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-farm-600" />
              Allocation Details
            </div>
            <div>
              <span className="text-earth-500 block text-[11px]">Farm Estate</span>
              <span className="font-semibold text-earth-900">
                {expense.farm_name || "General Farm"}
              </span>
            </div>
            <div>
              <span className="text-earth-500 block text-[11px]">Field Plot</span>
              <span className="font-medium text-earth-800">
                {expense.field_name || "Entire Farm / Non-plot specific"}
              </span>
            </div>
            <div>
              <span className="text-earth-500 block text-[11px]">Crop Cycle</span>
              <span className="font-medium text-earth-800">
                {expense.crop_name || "Not linked to specific crop"}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 p-3.5 bg-white border border-earth-200 rounded-xl">
            <div className="font-semibold text-earth-900 border-b border-earth-100 pb-1.5 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-earth-600" />
              Billing & Vendor Information
            </div>
            <div>
              <span className="text-earth-500 block text-[11px]">Vendor / Supplier</span>
              <span className="font-medium text-earth-800">
                {expense.vendor_name || "N/A (Direct purchase)"}
              </span>
            </div>
            <div>
              <span className="text-earth-500 block text-[11px]">Invoice / Bill Number</span>
              <span className="font-medium text-earth-800 font-mono">
                {expense.invoice_number || "None"}
              </span>
            </div>
            <div>
              <span className="text-earth-500 block text-[11px]">Payment Mode</span>
              <span className="font-medium text-earth-800 capitalize">
                {expense.payment_method?.replace("_", " ") || "Not specified"}
              </span>
            </div>
          </div>
        </div>

        {/* Description & Notes */}
        {(expense.description || expense.notes) && (
          <div className="p-3.5 bg-white border border-earth-200 rounded-xl text-xs space-y-2">
            {expense.description && (
              <div>
                <span className="font-semibold text-earth-800 block mb-0.5">
                  Description:
                </span>
                <p className="text-earth-600 whitespace-pre-line">
                  {expense.description}
                </p>
              </div>
            )}
            {expense.notes && (
              <div>
                <span className="font-semibold text-earth-800 block mb-0.5">
                  Notes:
                </span>
                <p className="text-earth-600 whitespace-pre-line italic">
                  {expense.notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Disbursement Ledger Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-earth-900 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-farm-600" />
              Disbursement Payment Ledger ({expense.payments?.length || 0})
            </span>
            {!isFullyPaid && onRecordPayment && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRecordPayment(expense)}
                className="text-xs text-emerald-700 hover:text-emerald-800"
              >
                + Record Payment
              </Button>
            )}
          </div>

          {(!expense.payments || expense.payments.length === 0) ? (
            <div className="p-4 bg-earth-50 border border-earth-200 rounded-lg text-center text-xs text-earth-500">
              No payments disbursed yet. Total balance is pending.
            </div>
          ) : (
            <div className="border border-earth-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-earth-50 text-earth-600 font-semibold text-[11px] uppercase">
                  <tr className="border-b border-earth-200">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3">Reference</th>
                    <th className="py-2 px-3 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-100 text-earth-800">
                  {expense.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-earth-50/50">
                      <td className="py-2 px-3 whitespace-nowrap text-earth-600">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="py-2 px-3 capitalize font-medium">
                        {p.payment_method.replace("_", " ")}
                      </td>
                      <td className="py-2 px-3 font-mono text-[11px] text-earth-500">
                        {p.transaction_reference || "-"}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                        {formatInr(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-earth-100 text-xs text-earth-400">
          <span>
            Created {formatDate(expense.created_at)}
          </span>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
