"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout";
import { Button, ErrorState } from "@/components/ui";
import { IncomeCategoryBadge } from "@/components/income/IncomeCategoryBadge";
import { DeleteIncomeDialog } from "@/components/income/DeleteIncomeDialog";
import { incomeApi } from "@/lib/api/income";
import { OtherIncome } from "@/types";
import {
  Coins,
  ArrowLeft,
  Calendar,
  Building,
  CreditCard,
  FileText,
  User,
  Edit,
  Trash2,
  DollarSign,
  Tag,
  AlertCircle,
} from "lucide-react";

export default function IncomeDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const incomeId = params?.id as string;

  const [income, setIncome] = useState<OtherIncome | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchIncome = useCallback(async () => {
    if (!incomeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await incomeApi.getIncomeById(incomeId);
      if (res.error || !res.data) {
        throw new Error(res.error || "Income record not found");
      }
      setIncome(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load income details.");
    } finally {
      setIsLoading(false);
    }
  }, [incomeId]);

  useEffect(() => {
    fetchIncome();
  }, [fetchIncome]);

  const handleDelete = async () => {
    if (!income) return;
    const res = await incomeApi.deleteIncome(income.id);
    if (res.error) throw new Error(res.error);
    router.push("/income");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-sm font-medium text-slate-500">Loading income entry...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !income) {
    return (
      <DashboardLayout>
        <div className="py-12">
          <ErrorState
            title="Income Record Not Found"
            message={error || "The specified income record does not exist or access is unauthorized."}
            onRetry={fetchIncome}
          />
          <div className="mt-4 text-center">
            <Link
              href="/income"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Income Directory
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        {/* Navigation & Actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/income"
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {income.description}
                </h1>
                <IncomeCategoryBadge category={income.category} />
              </div>
              <p className="text-sm text-slate-500">
                Received on {new Date(income.income_date).toLocaleDateString()} &middot; ID: {income.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/income/${income.id}/edit`}>
              <Button variant="secondary" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Amount Received
            </span>
            <div className="mt-2 text-3xl font-extrabold text-emerald-700">
              ${Number(income.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-emerald-600">Deposited to farm account</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Receiving Farm
            </span>
            <div className="mt-2 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Building className="h-5 w-5 text-slate-400" />
              {income.farm_name || "Registered Farm"}
            </div>
            <p className="mt-1 text-xs text-slate-500">Farm ID: {income.farm_id.slice(0, 8)}...</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Payment Method
            </span>
            <div className="mt-2 flex items-center gap-2 text-lg font-bold uppercase text-slate-900">
              <CreditCard className="h-5 w-5 text-slate-400" />
              {income.payment_method?.replace("_", " ") || "N/A"}
            </div>
            <p className="mt-1 text-xs text-slate-500">Ref: {income.reference_number || "None"}</p>
          </div>
        </div>

        {/* Details Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText className="h-5 w-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">Full Income Specification</h2>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <span className="text-xs text-slate-400">Source / Payer</span>
              <p className="mt-1 text-base font-semibold text-slate-900">{income.source || "Direct / Internal"}</p>
            </div>

            <div>
              <span className="text-xs text-slate-400">Transaction / Cheque Reference</span>
              <p className="mt-1 text-base font-mono font-medium text-slate-800">
                {income.reference_number || "No reference recorded"}
              </p>
            </div>

            <div>
              <span className="text-xs text-slate-400">Creation Timestamp</span>
              <p className="mt-1 text-sm text-slate-700">
                {new Date(income.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <span className="text-xs text-slate-400">Last Modified</span>
              <p className="mt-1 text-sm text-slate-700">
                {new Date(income.updated_at).toLocaleString()}
              </p>
            </div>

            {income.notes && (
              <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                <span className="text-xs text-slate-400">Additional Notes</span>
                <p className="mt-1 text-sm italic text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  "{income.notes}"
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {isDeleteDialogOpen && (
        <DeleteIncomeDialog
          isOpen={isDeleteDialogOpen}
          income={income}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </DashboardLayout>
  );
}
