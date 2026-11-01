"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/layout";
import { Button } from "@/components/ui";
import { incomeApi } from "@/lib/api/income";
import { OtherIncome, OtherIncomeUpdatePayload } from "@/types";
import {
  Coins,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Save,
} from "lucide-react";

const INCOME_CATEGORIES = [
  { value: "government_subsidy", label: "Government Subsidy / Grant" },
  { value: "equipment_rental", label: "Equipment / Machinery Rental" },
  { value: "insurance_claim", label: "Crop / Asset Insurance Claim" },
  { value: "land_lease", label: "Land Lease / Sublease" },
  { value: "consulting_service", label: "Agricultural Consulting / Services" },
  { value: "scrap_byproduct_sales", label: "Byproduct / Scrap Sales" },
  { value: "miscellaneous", label: "Miscellaneous Farm Income" },
];

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Direct Bank Transfer / NEFT / RTGS" },
  { value: "cash", label: "Cash Payment" },
  { value: "check", label: "Check / Cheque" },
  { value: "upi", label: "UPI / Digital Wallet" },
  { value: "other", label: "Other Method" },
];

export default function EditIncomePage() {
  const params = useParams();
  const router = useRouter();
  const incomeId = params?.id as string;

  const [income, setIncome] = useState<OtherIncome | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [incomeDate, setIncomeDate] = useState("");
  const [category, setCategory] = useState("government_subsidy");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadIncome() {
      if (!incomeId) return;
      setIsLoading(true);
      try {
        const res = await incomeApi.getIncomeById(incomeId);
        if (res.error || !res.data) {
          throw new Error(res.error || "Income record not found");
        }
        const data = res.data;
        setIncome(data);
        setIncomeDate(data.income_date.split("T")[0]);
        setCategory(data.category);
        setDescription(data.description);
        setAmount(String(data.amount));
        setSource(data.source || "");
        setPaymentMethod(data.payment_method || "bank_transfer");
        setReferenceNumber(data.reference_number || "");
        setNotes(data.notes || "");
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load income entry.");
      } finally {
        setIsLoading(false);
      }
    }
    loadIncome();
  }, [incomeId]);

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!description.trim()) {
      setErrorMessage("Description is required.");
      return;
    }
    if (numAmount <= 0) {
      setErrorMessage("Amount must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: OtherIncomeUpdatePayload = {
        income_date: incomeDate,
        category,
        description: description.trim(),
        amount: numAmount,
        source: source.trim() || null,
        payment_method: paymentMethod || null,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
      };

      const res = await incomeApi.updateIncome(incomeId, payload);
      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

      router.push(`/income/${incomeId}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update income record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-sm font-medium text-slate-500">Loading income record...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!income) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">Income Record Not Found</h2>
          <p className="mt-1 text-sm text-slate-500">{errorMessage || "Invalid record identifier."}</p>
          <div className="mt-4">
            <Link href="/income" className="text-sm font-medium text-emerald-600 hover:underline">
              Return to Income List
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex items-center gap-4">
          <Link
            href={`/income/${income.id}`}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Edit Income Record
            </h1>
            <p className="text-sm text-slate-500">
              Farm: <span className="font-semibold text-slate-800">{income.farm_name || "Assigned Farm"}</span> &middot; ID: {income.id}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Coins className="h-5 w-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-900">Edit Income Parameters</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Received Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={incomeDate}
                  onChange={(e) => setIncomeDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Income Category <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {INCOME_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Amount Received ($) <span className="text-rose-500">*</span>
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Description / Purpose <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Source */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Payer / Funding Source
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Transaction / Cheque Reference #
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Internal Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Link href={`/income/${income.id}`}>
              <Button variant="secondary" type="button">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
