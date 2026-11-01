import React, { useState, useEffect } from "react";
import {
  Farm,
  Field,
  Crop,
  Expense,
  ExpenseCreatePayload,
  ExpenseUpdatePayload,
  ExpenseCategory,
} from "@/types";
import { Modal, Button, Input } from "@/components/ui";
import { Receipt, AlertCircle, CheckCircle2 } from "lucide-react";

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

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    payload: ExpenseCreatePayload | ExpenseUpdatePayload
  ) => Promise<void>;
  editingExpense?: Expense | null;
  farms: Farm[];
  fields: Field[];
  crops: Crop[];
}

export function ExpenseFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingExpense,
  farms,
  fields,
  crops,
}: ExpenseFormModalProps) {
  const isEdit = Boolean(editingExpense);

  const [farmId, setFarmId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [cropId, setCropId] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("seeds");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<string>("");
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
  const [formError, setFormError] = useState<string | null>(null);

  // Sync state when editing or opening
  useEffect(() => {
    if (editingExpense) {
      setFarmId(editingExpense.farm_id);
      setFieldId(editingExpense.field_id || "");
      setCropId(editingExpense.crop_id || "");
      setCategory(editingExpense.category);
      setTitle(editingExpense.title);
      setDescription(editingExpense.description || "");
      setAmount(String(editingExpense.amount));
      setExpenseDate(editingExpense.expense_date);
      setPaymentStatus(
        editingExpense.payment_status === "paid" ? "paid" : "unpaid"
      );
      setPaymentMethod(editingExpense.payment_method || "cash");
      setVendorName(editingExpense.vendor_name || "");
      setInvoiceNumber(editingExpense.invoice_number || "");
      setTransactionReference(editingExpense.transaction_reference || "");
      setNotes(editingExpense.notes || "");
    } else {
      setFarmId(farms.length > 0 ? farms[0].id : "");
      setFieldId("");
      setCropId("");
      setCategory("seeds");
      setTitle("");
      setDescription("");
      setAmount("");
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setPaymentStatus("unpaid");
      setPaymentMethod("cash");
      setVendorName("");
      setInvoiceNumber("");
      setTransactionReference("");
      setNotes("");
    }
    setFormError(null);
  }, [editingExpense, farms, isOpen]);

  // Available plots and crops filtered by selected farm
  const availableFields = farmId
    ? fields.filter((f) => f.farm_id === farmId)
    : fields;
  const availableCrops = fieldId
    ? crops.filter((c) => c.field_id === fieldId)
    : crops;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!farmId) {
      setFormError("Please select a target farm estate.");
      return;
    }
    if (!title.trim()) {
      setFormError("Please provide an expense title.");
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError("Expense amount must be a positive number greater than zero.");
      return;
    }

    if (isEdit && editingExpense) {
      if (numAmount < editingExpense.amount_paid) {
        setFormError(
          `Cannot reduce amount below already recorded payments (₹${editingExpense.amount_paid.toFixed(
            2
          )}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (isEdit) {
        const updatePayload: ExpenseUpdatePayload = {
          farm_id: farmId,
          field_id: fieldId || null,
          crop_id: cropId || null,
          category,
          title: title.trim(),
          description: description.trim() || null,
          amount: numAmount,
          expense_date: expenseDate,
          payment_method: paymentMethod || null,
          vendor_name: vendorName.trim() || null,
          invoice_number: invoiceNumber.trim() || null,
          transaction_reference: transactionReference.trim() || null,
          notes: notes.trim() || null,
        };
        await onSubmit(updatePayload);
      } else {
        const createPayload: ExpenseCreatePayload = {
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
        };
        await onSubmit(createPayload);
      }
      onClose();
    } catch (err: any) {
      setFormError(
        err.message || "Failed to save expense record. Please verify entries."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Edit Farm Expense" : "Record New Farm Expense"}
      description={
        isEdit
          ? "Update expenditure details or adjust totals with audit integrity."
          : "Add farm operational expenditure across inputs, seeds, labour, machinery, or utilities."
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        {/* Section 1: Farm & Plot Hierarchy */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        {/* Section 2: Category & Title */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Expense Category <span className="text-rose-500">*</span>
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
              placeholder="e.g. Drip Pipe Lateral 16mm or Diesel 50L"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Section 3: Amount, Date & Payment Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Total Amount (₹) <span className="text-rose-500">*</span>
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

          {!isEdit && (
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
          )}
        </div>

        {/* Section 4: Payment Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-earth-100">
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
              Transaction / UPI Reference (Optional)
            </label>
            <Input
              type="text"
              placeholder="e.g. UPI/123456789 or Cheque #004521"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
            />
          </div>
        </div>

        {/* Section 5: Vendor & Invoice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

        {/* Description & Notes */}
        <div>
          <label className="block text-xs font-semibold text-earth-700 mb-1">
            Description or Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Add operational context, warranty period, or details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs md:text-sm rounded-lg border border-earth-300 focus:outline-hidden focus:ring-2 focus:ring-farm-500/20 focus:border-farm-600 bg-white text-earth-900"
          />
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-earth-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : isEdit
              ? "Update Expense"
              : "Save Expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
