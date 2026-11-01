import React, { useState, useEffect } from "react";
import { Modal, Button } from "@/components/ui";
import { Sale, SalePaymentCreatePayload } from "@/types";
import { CreditCard, AlertCircle, Loader2 } from "lucide-react";

interface RecordSalePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onSubmit: (saleId: string, payload: SalePaymentCreatePayload) => Promise<void>;
}

export function RecordSalePaymentModal({
  isOpen,
  onClose,
  sale,
  onSubmit,
}: RecordSalePaymentModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (sale) {
      setAmount(String(sale.outstanding_amount > 0 ? sale.outstanding_amount : ""));
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setPaymentMethod("cash");
      setReferenceNumber("");
      setNotes("");
    }
    setErrorMessage(null);
  }, [sale, isOpen]);

  if (!sale) return null;

  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const outstanding = sale.outstanding_amount || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      setErrorMessage("Payment amount must be strictly greater than zero.");
      return;
    }

    if (numAmount > outstanding) {
      setErrorMessage(
        `Payment amount (${formatInr(numAmount)}) cannot exceed outstanding balance (${formatInr(outstanding)}).`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: SalePaymentCreatePayload = {
        amount: numAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || null,
        notes: notes.trim() || null,
      };
      await onSubmit(sale.id, payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Payment Receipt"
      description={`Log customer payment collection for ${sale.sale_number}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Sale Summary Banner */}
        <div className="bg-earth-50 rounded-xl p-3 border border-earth-200 flex items-center justify-between text-xs font-mono">
          <div>
            <span className="text-earth-500 block text-[11px]">Customer</span>
            <span className="font-semibold text-earth-900">{sale.buyer_name}</span>
          </div>
          <div>
            <span className="text-earth-500 block text-[11px]">Total Value</span>
            <span className="font-semibold text-earth-900">{formatInr(sale.total_amount)}</span>
          </div>
          <div>
            <span className="text-earth-500 block text-[11px]">Due Balance</span>
            <span className="font-bold text-amber-700">{formatInr(outstanding)}</span>
          </div>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Payment Amount (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={outstanding}
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 font-mono font-bold text-emerald-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Payment Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
          </div>
        </div>

        {/* Payment Method & Reference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Payment Method <span className="text-rose-500">*</span>
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="upi">UPI / QR Code</option>
              <option value="cheque">Bank Cheque</option>
              <option value="card">Debit / Credit Card</option>
              <option value="other">Other Payment Mode</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Transaction / Reference ID
            </label>
            <input
              type="text"
              placeholder="e.g. UTR-998811 or Cheque #202"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">
            Collection Notes
          </label>
          <textarea
            rows={2}
            placeholder="Deposit account details, payer notes, or branch details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
          />
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-earth-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Recording...</span>
              </span>
            ) : (
              <span>Confirm Receipt</span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default RecordSalePaymentModal;
