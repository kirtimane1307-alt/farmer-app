"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Card, Button, Input } from "@/components/ui";
import { expensesApi } from "@/lib/api/expenses";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { cropsApi } from "@/lib/api/crops";
import { Farm, Field, Crop, ExpenseCategory } from "@/types";
import {
  Receipt,
  ArrowLeft,
  AlertCircle,
  Building2,
  Calendar,
  IndianRupee,
  Layers,
  Wheat,
  CreditCard,
  FileText,
} from "lucide-react";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "labour", label: "Labour" },
  { value: "fertilizer", label: "Fertilizer" },
  { value: "pesticide", label: "Pesticide" },
  { value: "seeds", label: "Seeds" },
  { value: "irrigation", label: "Irrigation" },
  { value: "fuel", label: "Fuel" },
  { value: "equipment", label: "Equipment" },
  { value: "maintenance_and_repairs", label: "Maintenance & Repairs" },
  { value: "transportation", label: "Transportation" },
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "rent_and_leasing", label: "Rent & Leasing" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer (NEFT / RTGS / IMPS)" },
  { value: "upi", label: "UPI (GPay / PhonePe / Paytm)" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Debit / Credit Card" },
  { value: "other", label: "Other Payment Mode" },
];

export default function NewExpensePage() {
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  // Form State
  const [farmId, setFarmId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [cropId, setCropId] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("seeds");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "paid">("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [vendorName, setVendorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetadata() {
      try {
        const [farmsRes, fieldsRes, cropsRes] = await Promise.all([
          farmsApi.getFarms(),
          fieldsApi.getFields(),
          cropsApi.getCrops(),
        ]);
        if (farmsRes.data) {
          setFarms(farmsRes.data);
          if (farmsRes.data.length > 0) {
            setFarmId(farmsRes.data[0].id);
          }
        }
        if (fieldsRes.data) setFields(fieldsRes.data);
        if (cropsRes.data) setCrops(cropsRes.data);
      } catch (err: any) {
        setError("Failed to load estate metadata.");
      } finally {
        setIsLoadingMetadata(false);
      }
    }
    loadMetadata();
  }, []);

  const availableFields = farmId
    ? fields.filter((f) => f.farm_id === farmId)
    : fields;
  const availableCrops = fieldId
    ? crops.filter((c) => c.field_id === fieldId)
    : crops;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!farmId) {
      setError("Please select a target farm estate.");
      return;
    }
    if (!title.trim()) {
      setError("Please provide an expense title.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Expense amount must be a positive number greater than zero.");
      return;
    }

    setIsSubmitting(true);
    try {
      await expensesApi.createExpense({
        farm_id: farmId,
        field_id: fieldId || null,
        crop_id: cropId || null,
        category,
        title: title.trim(),
        description: description.trim() || null,
        amount: numAmount,
        expense_date: expenseDate,
        payment_status: paymentStatus,
        payment_method: paymentMethod || null,
        vendor_name: vendorName.trim() || null,
        invoice_number: invoiceNumber.trim() || null,
        transaction_reference: transactionReference.trim() || null,
        notes: notes.trim() || null,
        initial_payment: paymentStatus === "paid",
      });
      router.push("/expenses");
    } catch (err: any) {
      setError(err.message || "Failed to record expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Record New Farm Expense"
        description="Add operating expenditures across farm estates, field plots, and crop cycles."
        phaseBadge="Phase 12"
        breadcrumbs={[
          { label: "Financials", href: "/expenses" },
          { label: "Expenses", href: "/expenses" },
          { label: "New Expense" },
        ]}
        actions={
          <Link href="/expenses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back to Expenses
            </Button>
          </Link>
        }
      />

      <div className="max-w-3xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs md:text-sm text-rose-700 flex items-start gap-2.5 shadow-2xs">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Card 1: Estate & Plot Hierarchy */}
          <Card className="p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-earth-100 pb-3">
              <Building2 className="h-5 w-5 text-farm-600" />
              <div>
                <h3 className="font-semibold text-earth-900 text-sm">
                  1. Farm & Spatial Allocation
                </h3>
                <p className="text-xs text-earth-500">
                  Select the estate, and optionally associate with a specific plot or crop.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Farm Estate <span className="text-rose-500">*</span>
                </label>
                <select
                  value={farmId}
                  onChange={(e) => {
                    setFarmId(e.target.value);
                    setFieldId("");
                    setCropId("");
                  }}
                  required
                  className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-earth-300 bg-white text-earth-900 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
                >
                  <option value="" disabled>
                    Select Farm
                  </option>
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Field Plot (Optional)
                </label>
                <select
                  value={fieldId}
                  onChange={(e) => {
                    setFieldId(e.target.value);
                    setCropId("");
                  }}
                  className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-earth-300 bg-white text-earth-900 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
                >
                  <option value="">Whole Farm (General)</option>
                  {availableFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.area} acres)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Crop Cycle (Optional)
                </label>
                <select
                  value={cropId}
                  onChange={(e) => setCropId(e.target.value)}
                  className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-earth-300 bg-white text-earth-900 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
                >
                  <option value="">General (No Crop)</option>
                  {availableCrops.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.variety})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Card 2: Expense Description & Category */}
          <Card className="p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-earth-100 pb-3">
              <Receipt className="h-5 w-5 text-farm-600" />
              <div>
                <h3 className="font-semibold text-earth-900 text-sm">
                  2. Expenditure Details
                </h3>
                <p className="text-xs text-earth-500">
                  Select supported category and provide clear itemization.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  required
                  className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-earth-300 bg-white text-earth-900 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Expense Title <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Tractor Diesel 60L or Nursery Grafted Seedlings"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Amount in INR (₹) <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Expense Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatus}
                  onChange={(e) =>
                    setPaymentStatus(e.target.value as "unpaid" | "paid")
                  }
                  className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-earth-300 bg-white text-earth-900 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
                >
                  <option value="unpaid">Unpaid (Bill Pending)</option>
                  <option value="paid">Already Paid in Full</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Itemized breakdown, specifications, or operational purpose..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-earth-300 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600 bg-white text-earth-900"
              />
            </div>
          </Card>

          {/* Card 3: Vendor, Payment & Accounting Details */}
          <Card className="p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-earth-100 pb-3">
              <CreditCard className="h-5 w-5 text-farm-600" />
              <div>
                <h3 className="font-semibold text-earth-900 text-sm">
                  3. Billing & Vendor References
                </h3>
                <p className="text-xs text-earth-500">
                  Track vendor bills, invoice serials, and bank transactions.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-earth-300 bg-white text-earth-900 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.value} value={pm.value}>
                      {pm.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Transaction / Cheque Reference (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. UPI/123456789 or Cheque #004521"
                  value={transactionReference}
                  onChange={(e) => setTransactionReference(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Vendor / Supplier Name (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Kisan Agro Center, Indian Oil, Mahindra Motors"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-earth-700 mb-1">
                  Bill / Invoice Number (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. INV-2026-902"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-earth-700 mb-1">
                Internal Notes (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g. Payment due in 30 days; warranty receipt in office binder"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </Card>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/expenses">
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isLoadingMetadata}
              className="bg-farm-600 hover:bg-farm-700 text-white font-medium shadow-2xs"
            >
              {isSubmitting ? "Saving..." : "Record Farm Expense"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
