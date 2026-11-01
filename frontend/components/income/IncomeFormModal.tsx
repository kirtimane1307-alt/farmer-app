import React, { useState, useEffect } from "react";
import { Modal, Button } from "@/components/ui";
import {
  Farm,
  OtherIncome,
  OtherIncomeCreatePayload,
  OtherIncomeUpdatePayload,
} from "@/types";
import { Coins, AlertCircle, Loader2 } from "lucide-react";

interface IncomeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  incomeToEdit?: OtherIncome | null;
  farms: Farm[];
}

export function IncomeFormModal({
  isOpen,
  onClose,
  onSubmit,
  incomeToEdit,
  farms,
}: IncomeFormModalProps) {
  const isEditing = Boolean(incomeToEdit);

  const [farmId, setFarmId] = useState<string>("");
  const [incomeDate, setIncomeDate] = useState<string>("");
  const [category, setCategory] = useState<string>("government_subsidy");
  const [description, setDescription] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("bank_transfer");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (incomeToEdit) {
      setFarmId(incomeToEdit.farm_id || "");
      setIncomeDate(incomeToEdit.income_date || "");
      setCategory(incomeToEdit.category || "government_subsidy");
      setDescription(incomeToEdit.description || "");
      setAmount(String(incomeToEdit.amount || ""));
      setSource(incomeToEdit.source || "");
      setPaymentMethod(incomeToEdit.payment_method || "bank_transfer");
      setReferenceNumber(incomeToEdit.reference_number || "");
      setNotes(incomeToEdit.notes || "");
    } else {
      setFarmId(farms.length > 0 ? farms[0].id : "");
      setIncomeDate(new Date().toISOString().split("T")[0]);
      setCategory("government_subsidy");
      setDescription("");
      setAmount("");
      setSource("");
      setPaymentMethod("bank_transfer");
      setReferenceNumber("");
      setNotes("");
    }
    setErrorMessage(null);
  }, [incomeToEdit, isOpen, farms]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!farmId) {
      setErrorMessage("Please select a target farm estate.");
      return;
    }
    if (!description.trim()) {
      setErrorMessage("Description is required.");
      return;
    }
    const numAmount = parseFloat(amount) || 0;
    if (numAmount <= 0) {
      setErrorMessage("Income amount must be strictly greater than zero.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing && incomeToEdit) {
        const payload: OtherIncomeUpdatePayload = {
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
        await onSubmit(payload);
      } else {
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
        await onSubmit(payload);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save income record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Other Farm Income" : "Record Other Farm Income"}
      description="Record government subsidies, equipment rental income, insurance compensation, or other auxiliary revenue."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Farm */}
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Farm Estate <span className="text-rose-500">*</span>
            </label>
            <select
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white"
            >
              <option value="">Select Farm</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Income Date */}
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Date Received <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
          </div>
        </div>

        {/* Category & Amount */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Income Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white"
            >
              <option value="government_subsidy">Government Subsidy (PM-KISAN/Solar/Drip)</option>
              <option value="insurance_compensation">Insurance Compensation (Crop Loss/Disaster)</option>
              <option value="equipment_rental">Equipment & Machinery Rental</option>
              <option value="land_lease">Land Lease / Subletting</option>
              <option value="scrap_byproduct">Scrap & Farm By-product Sales</option>
              <option value="agro_tourism">Agro-Tourism & Educational Visits</option>
              <option value="consulting">Agricultural Consulting & Training</option>
              <option value="miscellaneous">Miscellaneous Income</option>
              <option value="other">Other Agricultural Revenue</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Amount Received (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="e.g. 25000.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 font-mono font-bold text-emerald-800"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">
            Description <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Subsidy received for solar water pump installation"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
          />
        </div>

        {/* Source & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Source / Payer Agency
            </label>
            <input
              type="text"
              placeholder="e.g. Dept of Agriculture"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white"
            >
              <option value="bank_transfer">Direct Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI / Online</option>
              <option value="cheque">Cheque</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              placeholder="e.g. REF-202610-01"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">
            Additional Observations / Notes
          </label>
          <textarea
            rows={2}
            placeholder="Disbursement details, scheme guidelines, or lease period..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-earth-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </span>
            ) : (
              <span>{isEditing ? "Save Changes" : "Record Income"}</span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default IncomeFormModal;
