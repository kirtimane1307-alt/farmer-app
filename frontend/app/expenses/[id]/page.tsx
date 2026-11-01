"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Card, Button, ErrorState } from "@/components/ui";
import {
  ExpenseCategoryBadge,
  ExpenseStatusBadge,
  RecordExpensePaymentModal,
  ExpenseFormModal,
  DeleteExpenseDialog,
} from "@/components/expenses";
import { expensesApi } from "@/lib/api/expenses";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { cropsApi } from "@/lib/api/crops";
import {
  Expense,
  Farm,
  Field,
  Crop,
  ExpensePaymentCreatePayload,
  ExpenseUpdatePayload,
} from "@/types";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  Pencil,
  Trash2,
  Receipt,
  Layers,
  Wheat,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expenseId = params?.id as string;

  const [expense, setExpense] = useState<Expense | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchExpense = async () => {
    if (!expenseId) return;
    try {
      const [expRes, farmsRes, fieldsRes, cropsRes] = await Promise.all([
        expensesApi.getExpenseById(expenseId),
        farmsApi.getFarms(),
        fieldsApi.getFields(),
        cropsApi.getCrops(),
      ]);
      if (expRes.data) setExpense(expRes.data);
      if (farmsRes.data) setFarms(farmsRes.data);
      if (fieldsRes.data) setFields(fieldsRes.data);
      if (cropsRes.data) setCrops(cropsRes.data);
    } catch (err: any) {
      setError(err.message || "Failed to load expense details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpense();
  }, [expenseId]);

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

  const handleUpdate = async (payload: any) => {
    if (!expense) return;
    await expensesApi.updateExpense(expense.id, payload as ExpenseUpdatePayload);
    setSuccessBanner("Expense updated successfully.");
    setTimeout(() => setSuccessBanner(null), 4000);
    await fetchExpense();
  };

  const handlePayment = async (expId: string, payload: ExpensePaymentCreatePayload) => {
    await expensesApi.recordPayment(expId, payload);
    setSuccessBanner(`Payment of ₹${payload.amount.toFixed(2)} recorded successfully.`);
    setTimeout(() => setSuccessBanner(null), 4000);
    await fetchExpense();
  };

  const handleDelete = async (expId: string) => {
    await expensesApi.deleteExpense(expId);
    router.push("/expenses");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-8 space-y-4 max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-earth-200 animate-pulse rounded" />
          <div className="h-64 bg-earth-100 animate-pulse rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !expense) {
    return (
      <DashboardLayout>
        <div className="space-y-4 max-w-lg mx-auto py-12">
          <ErrorState
            title="Expense Not Found"
            message={error || "The requested expense could not be located."}
            onRetry={fetchExpense}
          />
          <div className="text-center pt-2">
            <Button variant="outline" onClick={() => router.push("/expenses")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Expenses
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const isFullyPaid = expense.payment_status === "paid";

  return (
    <DashboardLayout>
      <PageHeader
        title={expense.title}
        description={`Expense details #${expense.id.slice(0, 8)} on ${expense.farm_name || "Farm"}`}
        phaseBadge="Phase 12"
        breadcrumbs={[
          { label: "Financials", href: "/expenses" },
          { label: "Expenses", href: "/expenses" },
          { label: expense.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/expenses">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                All Expenses
              </Button>
            </Link>
            {!isFullyPaid && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Record Payment
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Pencil className="h-4 w-4 mr-1.5 text-blue-600" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-rose-600 hover:text-rose-700"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          </div>
        }
      />

      {successBanner && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 text-sm"
          >
            &times;
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Financial Status Banner */}
        <div className="bg-white rounded-xl border border-earth-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ExpenseCategoryBadge category={expense.category} size="md" />
              <ExpenseStatusBadge status={expense.payment_status} size="md" />
            </div>
            <div className="text-xs text-earth-500">
              Incurred on <span className="font-semibold text-earth-700">{formatDate(expense.expense_date)}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-earth-500 block">
                Total Amount
              </span>
              <span className="text-2xl font-bold font-mono text-earth-900">
                {formatInr(expense.amount)}
              </span>
            </div>
            <div className="text-right border-l border-earth-200 pl-6">
              <span className="text-[10px] uppercase font-bold text-rose-600 block">
                Balance Due
              </span>
              <span className="text-2xl font-bold font-mono text-rose-700">
                {formatInr(expense.outstanding_balance)}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Detail Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Spatial Allocation Card */}
          <Card className="p-5 space-y-3 shadow-xs">
            <div className="font-semibold text-earth-900 text-sm border-b border-earth-100 pb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-farm-600" />
              Spatial & Operational Allocation
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-earth-500 block text-[11px]">Farm Estate</span>
                <span className="font-semibold text-earth-900 text-sm">
                  {expense.farm_name || "General Estate"}
                </span>
              </div>
              <div>
                <span className="text-earth-500 block text-[11px]">Field Plot</span>
                <span className="font-medium text-earth-800">
                  {expense.field_name || "Whole Farm (General Operation)"}
                </span>
              </div>
              <div>
                <span className="text-earth-500 block text-[11px]">Crop Cycle</span>
                <span className="font-medium text-earth-800">
                  {expense.crop_name || "Not linked to a specific crop cycle"}
                </span>
              </div>
            </div>
          </Card>

          {/* Vendor & Invoice Card */}
          <Card className="p-5 space-y-3 shadow-xs">
            <div className="font-semibold text-earth-900 text-sm border-b border-earth-100 pb-2 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-earth-600" />
              Vendor & Invoice Metadata
            </div>
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-earth-500 block text-[11px]">Vendor / Supplier</span>
                <span className="font-semibold text-earth-900 text-sm">
                  {expense.vendor_name || "Direct / Local Farm Purchase"}
                </span>
              </div>
              <div>
                <span className="text-earth-500 block text-[11px]">Invoice / Bill Number</span>
                <span className="font-mono font-medium text-earth-800">
                  {expense.invoice_number || "None"}
                </span>
              </div>
              <div>
                <span className="text-earth-500 block text-[11px]">Payment Mode</span>
                <span className="font-medium text-earth-800 capitalize">
                  {expense.payment_method?.replace("_", " ") || "Cash"}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Description & Notes Card */}
        {(expense.description || expense.notes) && (
          <Card className="p-5 text-xs space-y-3 shadow-xs">
            {expense.description && (
              <div>
                <span className="font-semibold text-earth-800 text-sm block mb-1">
                  Expenditure Description
                </span>
                <p className="text-earth-600 leading-relaxed whitespace-pre-line">
                  {expense.description}
                </p>
              </div>
            )}
            {expense.notes && (
              <div className="pt-2 border-t border-earth-100">
                <span className="font-semibold text-earth-800 text-sm block mb-1">
                  Accounting & Field Notes
                </span>
                <p className="text-earth-600 leading-relaxed whitespace-pre-line italic">
                  {expense.notes}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Disbursement Ledger History */}
        <Card className="p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-earth-100 pb-3">
            <div>
              <h3 className="font-semibold text-earth-900 text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-farm-600" />
                Payment Disbursement Ledger
              </h3>
              <p className="text-xs text-earth-500 mt-0.5">
                Audit trail of all installments and transactions recorded against this expense.
              </p>
            </div>
            {!isFullyPaid && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaymentModalOpen(true)}
                className="text-xs text-emerald-700 hover:text-emerald-800"
              >
                + Record Payment
              </Button>
            )}
          </div>

          {(!expense.payments || expense.payments.length === 0) ? (
            <div className="p-6 bg-earth-50 rounded-xl text-center text-xs text-earth-500">
              No payments disbursed yet. Full amount of {formatInr(expense.amount)} is pending.
            </div>
          ) : (
            <div className="border border-earth-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-earth-50/80 text-earth-600 font-semibold text-[11px] uppercase tracking-wider">
                  <tr className="border-b border-earth-200">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Payment Method</th>
                    <th className="py-2.5 px-4">Transaction Reference</th>
                    <th className="py-2.5 px-4">Notes</th>
                    <th className="py-2.5 px-4 text-right">Disbursed (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-100 text-earth-800">
                  {expense.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-earth-50/50">
                      <td className="py-2.5 px-4 whitespace-nowrap text-earth-600">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="py-2.5 px-4 capitalize font-medium">
                        {p.payment_method.replace("_", " ")}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-earth-500">
                        {p.transaction_reference || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-earth-500 truncate max-w-xs">
                        {p.notes || "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                        {formatInr(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <ExpenseFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdate}
        editingExpense={expense}
        farms={farms}
        fields={fields}
        crops={crops}
      />

      <RecordExpensePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        expense={expense}
        onSuccess={handlePayment}
      />

      <DeleteExpenseDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        expense={expense}
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
