import React, { useState, useEffect } from "react";
import { Expense, ExpensePaymentCreatePayload } from "@/types";
import { Modal, Button, Input } from "@/components/ui";
import { CreditCard, AlertCircle, CheckCircle2 } from "lucide-react";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer (NEFT / RTGS / IMPS)" },
  { value: "upi", label: "UPI (GPay / PhonePe / Paytm)" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Debit / Credit Card" },
  { value: "other", label: "Other Payment Mode" },
];

interface RecordExpensePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onSuccess: (expenseId: string, payload: ExpensePaymentCreatePayload) => Promise<void>;
}

export function RecordExpensePaymentModal({
  isOpen,
  onClose,
  expense,
  onSuccess,
}: RecordExpensePaymentModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expense) {
      setAmount(String(expense.outstanding_balance));
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod(expense.payment_method || "cash");
      setTransactionReference("");
      setNotes("");
      setError(null);
    }
  }, [expense, isOpen]);

  if (!expense) return null;

  const formatInr = (val: number) => {
    return `₹${val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const balance = expense.outstanding_balance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (numAmount > balance) {
      setError(
        `Payment amount (${formatInr(numAmount)}) exceeds the outstanding balance (${formatInr(
          balance
        )}).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSuccess(expense.id, {
        amount: numAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        transaction_reference: transactionReference.trim() || null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record payment disbursement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Expense Payment"
      description={`Disburse payment towards "${expense.title}"`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Current Balance Highlight */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-earth-50 rounded-xl border border-earth-200 text-xs">
          <div>
            <span className="text-earth-500 block text-[11px]">Total Expense</span>
            <span className="font-bold text-earth-900 font-mono text-sm">
              {formatInr(expense.amount)}
            </span>
          </div>
          <div>
            <span className="text-rose-600 block text-[11px] font-semibold">
              Outstanding Balance
            </span>
            <span className="font-bold text-rose-700 font-mono text-sm">
              {formatInr(expense.outstanding_balance)}
            </span>
          </div>
        </div>

        {/* Amount Input & Quick Shortcuts */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-earth-700">
              Payment Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setAmount(String(balance))}
                className="text-farm-700 hover:underline font-medium"
              >
                Full Balance
              </button>
              <span className="text-earth-300">|</span>
              <button
                type="button"
                onClick={() => setAmount(String((balance / 2).toFixed(2)))}
                className="text-farm-700 hover:underline font-medium"
              >
                50% Split
              </button>
            </div>
          </div>
          <Input
            type="number"
            step="0.01"
            min="0.01"
            max={balance}
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        {/* Payment Date & Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-earth-700 mb-1">
              Payment Method <span className="text-rose-500">*</span>
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
        </div>

        {/* Transaction Reference */}
        <div>
          <label className="block text-xs font-semibold text-earth-700 mb-1">
            Transaction Reference / Cheque No. (Optional)
          </label>
          <Input
            type="text"
            placeholder="e.g. UPI/123456789/GPay or Cheque #102938"
            value={transactionReference}
            onChange={(e) => setTransactionReference(e.target.value)}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-earth-700 mb-1">
            Payment Notes (Optional)
          </label>
          <Input
            type="text"
            placeholder="e.g. Paid via owner account at farm office"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-earth-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
