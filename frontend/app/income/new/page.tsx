"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui";
import { incomeApi } from "@/lib/api/income";
import { farmsApi } from "@/lib/api/farms";
import { Farm, OtherIncomeCreatePayload } from "@/types";
import {
  Coins,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Building,
  Calendar,
  CreditCard,
  FileText,
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

export default function NewIncomePage() {
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [isLoadingFarms, setIsLoadingFarms] = useState(true);

  // Form State
  const [farmId, setFarmId] = useState("");
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split("T")[0]);
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
    async function loadFarms() {
      try {
        const res = await farmsApi.getFarms();
        const farmList = res.data || [];
        setFarms(farmList);
        if (farmList.length > 0) {
          setFarmId(farmList[0].id);
        }
      } catch (err: any) {
        setErrorMessage("Failed to load available farms.");
      } finally {
        setIsLoadingFarms(false);
      }
    }
    loadFarms();
  }, []);

  const numAmount = parseFloat(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!farmId) {
      setErrorMessage("Please select a valid farm.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Description is required.");
      return;
    }
    if (numAmount <= 0) {
      setErrorMessage("Income amount must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: OtherIncomeCreatePayload = {
        farm_id: farmId,
        income_date: incomeDate,
        category,
        description: description.trim(),
        amount: numAmount,
        source: source.trim() || null,
        payment_method: paymentMethod || null,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
      };

      const res = await incomeApi.createIncome(payload);
      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

      router.push("/income");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record other income.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/income"
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Record Other Farm Income
            </h1>
            <p className="text-sm text-slate-500">
              Log auxiliary revenue streams separate from produce crop harvests.
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
              <h2 className="font-semibold text-slate-900">Income Stream Details</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Farm Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Beneficiary Farm <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={farmId}
                  onChange={(e) => setFarmId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {isLoadingFarms ? (
                    <option value="">Loading farms...</option>
                  ) : farms.length === 0 ? (
                    <option value="">No farms found</option>
                  ) : (
                    farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.location || "Location N/A"})
                      </option>
                    ))
                  )}
                </select>
              </div>

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
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Description / Purpose <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State solar pump subsidy or Harvester rental for 3 days"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Source / Payer */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Payer / Funding Source (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dept of Agriculture, Neighbouring Farm, Insurance Co"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
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

              {/* Reference Number */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Reference / Transaction / Cheque Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN987654321, CHQ-4091"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Internal Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional context or contract notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3">
            <Link href="/income">
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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Income
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
