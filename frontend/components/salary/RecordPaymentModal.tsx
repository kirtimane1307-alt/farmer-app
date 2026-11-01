"use client";

import React, { useState, useEffect } from "react";
import { SalaryRecord, PaymentMethod } from "@/types";
import { salaryApi } from "@/lib/api/salary";
import { Modal, Button, Select } from "@/components/ui";
import {
  IndianRupee,
  Calendar,
  AlertCircle,
  CheckCircle2,
  CreditCard,
  User,
  MapPin,
} from "lucide-react";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  salary: SalaryRecord | null;
  onPaymentSuccess: () => void;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  salary,
  onPaymentSuccess,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState<number | string>("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && salary) {
      const today = new Date().toISOString().split("T")[0];
      setPaymentDate(today);
      setAmount(salary.outstanding_balance);
      setPaymentMethod("cash");
      setTransactionRef("");
      setNotes("");
      setErrorMsg(null);
    }
  }, [isOpen, salary]);

  if (!salary) return null;

  const outstanding = Number(salary.outstanding_balance) || 0;
  const enteredAmount = Number(amount) || 0;
  const projectedBalance = Math.max(0, outstanding - enteredAmount);

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val ?? 0);
  };

  const handleDisbursePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (enteredAmount <= 0) {
      setErrorMsg("Payment amount must be greater than zero.");
      return;
    }

    if (enteredAmount > outstanding) {
      setErrorMsg(
        `Payment amount (${formatCurrency(enteredAmount)}) cannot exceed outstanding balance (${formatCurrency(outstanding)}).`
      );
      return;
    }

    if (!paymentDate) {
      setErrorMsg("Please select a disbursement date.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await salaryApi.recordPayment(salary.id, {
      amount: enteredAmount,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      transaction_reference: transactionRef.trim() || undefined,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error || "Failed to record payment.");
    } else {
      onPaymentSuccess();
      onClose();
    }
  };

  const paymentMethodOptions = [
    { value: "cash", label: "Cash Disbursement" },
    { value: "bank_transfer", label: "Bank Wire / NEFT / IMPS" },
    { value: "upi", label: "UPI (Google Pay / PhonePe / Paytm)" },
    { value: "cheque", label: "Bank Cheque" },
    { value: "other", label: "Other Mode" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Disburse Wage Payment"
      description="Record a partial or full salary installment with transaction audit tracking."
      size="md"
    >
      <form onSubmit={handleDisbursePayment} className="space-y-4 py-1">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Worker & Ledger Balance Summary */}
        <div className="p-3.5 bg-earth-50 rounded-xl border border-earth-200 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-earth-900 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-farm-600" />
              {salary.labour_name || "Worker"}
            </div>
            <div className="text-earth-500 flex items-center gap-1">
              <MapPin className="h-3 w-3 text-earth-400" />
              {salary.farm_name || "Farm"}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-earth-200/80 text-center">
            <div>
              <span className="text-[10px] text-earth-500 uppercase block">Total Net</span>
              <span className="font-bold text-earth-800">{formatCurrency(salary.net_salary)}</span>
            </div>
            <div>
              <span className="text-[10px] text-earth-500 uppercase block">Already Paid</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(salary.amount_paid)}</span>
            </div>
            <div>
              <span className="text-[10px] text-earth-500 uppercase block">Balance Due</span>
              <span className="font-bold text-amber-700">{formatCurrency(salary.outstanding_balance)}</span>
            </div>
          </div>
        </div>

        {/* Payment Amount */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">
            Payment Amount (₹) <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-xs font-bold text-earth-400">₹</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={outstanding}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="block w-full rounded-lg border border-earth-300 pl-7 pr-3 py-2 text-xs text-earth-900 shadow-2xs font-semibold focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] text-earth-500">
            <span>Projected Balance After Payment:</span>
            <span className="font-semibold text-earth-800">{formatCurrency(projectedBalance)}</span>
          </div>
        </div>

        {/* Date & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <Select
              options={paymentMethodOptions}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="text-xs"
            />
          </div>
        </div>

        {/* Reference */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">
            Transaction Reference / Voucher ID (Optional)
          </label>
          <input
            type="text"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            placeholder="e.g. UPI Ref #, NEFT UTR, or Cash Voucher No."
            className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">Remarks / Note (Optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Handed cash in person to worker"
            className="block w-full rounded-lg border border-earth-300 px-3 py-2 text-xs text-earth-900 shadow-2xs focus:border-farm-600 focus:outline-none focus:ring-2 focus:ring-farm-500/20"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-earth-100">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={isSubmitting || enteredAmount <= 0}
            className="bg-farm-600 hover:bg-farm-700 text-white font-semibold flex items-center gap-1.5"
          >
            <IndianRupee className="h-3.5 w-3.5" />
            {isSubmitting ? "Processing..." : `Disburse ${formatCurrency(enteredAmount)}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
