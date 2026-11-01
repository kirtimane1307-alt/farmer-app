import React, { useState, useEffect, useMemo } from "react";
import { Modal, Button } from "@/components/ui";
import {
  Farm,
  Field,
  Crop,
  Sale,
  SaleCreatePayload,
  SaleUpdatePayload,
} from "@/types";
import {
  TrendingUp,
  AlertCircle,
  Loader2,
  Receipt,
  DollarSign,
  User,
  Package,
} from "lucide-react";

interface SaleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => Promise<void>;
  saleToEdit?: Sale | null;
  farms: Farm[];
  fields: Field[];
  crops: Crop[];
  harvests?: any[];
}

export function SaleFormModal({
  isOpen,
  onClose,
  onSubmit,
  saleToEdit,
  farms,
  fields,
  crops,
  harvests = [],
}: SaleFormModalProps) {
  const isEditing = Boolean(saleToEdit);

  // Form State
  const [farmId, setFarmId] = useState<string>("");
  const [fieldId, setFieldId] = useState<string>("");
  const [cropId, setCropId] = useState<string>("");
  const [harvestId, setHarvestId] = useState<string>("");

  const [saleNumber, setSaleNumber] = useState<string>("");
  const [saleDate, setSaleDate] = useState<string>("");
  const [buyerName, setBuyerName] = useState<string>("");
  const [buyerPhone, setBuyerPhone] = useState<string>("");
  const [buyerAddress, setBuyerAddress] = useState<string>("");

  const [productName, setProductName] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>("kg");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("0");

  // Initial Payment (Creation only)
  const [hasInitialPayment, setHasInitialPayment] = useState<boolean>(false);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");
  const [referenceNumber, setReferenceNumber] = useState<string>("");

  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (saleToEdit) {
      setFarmId(saleToEdit.farm_id || "");
      setFieldId(saleToEdit.field_id || "");
      setCropId(saleToEdit.crop_id || "");
      setHarvestId(saleToEdit.harvest_id || "");
      setSaleNumber(saleToEdit.sale_number || "");
      setSaleDate(saleToEdit.sale_date || "");
      setBuyerName(saleToEdit.buyer_name || "");
      setBuyerPhone(saleToEdit.buyer_phone || "");
      setBuyerAddress(saleToEdit.buyer_address || "");
      setProductName(saleToEdit.product_name || "");
      setQuantity(String(saleToEdit.quantity || ""));
      setUnit(saleToEdit.unit || "kg");
      setUnitPrice(String(saleToEdit.unit_price || ""));
      setDiscountAmount(String(saleToEdit.discount_amount || "0"));
      setPaymentMethod(saleToEdit.payment_method || "cash");
      setNotes(saleToEdit.notes || "");
      setHasInitialPayment(false);
      setInitialPaymentAmount("");
      setReferenceNumber("");
    } else {
      setFarmId(farms.length > 0 ? farms[0].id : "");
      setFieldId("");
      setCropId("");
      setHarvestId("");
      setSaleNumber("");
      setSaleDate(new Date().toISOString().split("T")[0]);
      setBuyerName("");
      setBuyerPhone("");
      setBuyerAddress("");
      setProductName("");
      setQuantity("");
      setUnit("kg");
      setUnitPrice("");
      setDiscountAmount("0");
      setHasInitialPayment(false);
      setInitialPaymentAmount("");
      setPaymentMethod("cash");
      setReferenceNumber("");
      setNotes("");
    }
    setErrorMessage(null);
  }, [saleToEdit, isOpen, farms]);

  // Dependent filtered fields
  const filteredFields = useMemo(() => {
    if (!farmId) return [];
    return fields.filter((f) => f.farm_id === farmId);
  }, [fields, farmId]);

  // Dependent filtered crops
  const filteredCrops = useMemo(() => {
    if (!farmId) return [];
    if (fieldId) {
      return crops.filter((c) => c.field_id === fieldId);
    }
    // All crops in this farm's fields
    const farmFieldIds = new Set(filteredFields.map((f) => f.id));
    return crops.filter((c) => farmFieldIds.has(c.field_id));
  }, [crops, farmId, fieldId, filteredFields]);

  // Dependent filtered harvests
  const filteredHarvests = useMemo(() => {
    if (!farmId) return [];
    return harvests.filter((h) => {
      if (h.farm_id !== farmId) return false;
      if (cropId && h.crop_id !== cropId) return false;
      return true;
    });
  }, [harvests, farmId, cropId]);

  // When crop is selected, auto-fill product name if blank
  const handleCropChange = (selectedCropId: string) => {
    setCropId(selectedCropId);
    if (selectedCropId) {
      const selectedCrop = crops.find((c) => c.id === selectedCropId);
      if (selectedCrop && (!productName || productName.trim() === "")) {
        setProductName(`${selectedCrop.name} (${selectedCrop.variety})`);
      }
    }
  };

  // When harvest is selected, auto-fill quantity and unit if blank
  const handleHarvestChange = (selectedHarvestId: string) => {
    setHarvestId(selectedHarvestId);
    if (selectedHarvestId) {
      const h = harvests.find((item) => item.id === selectedHarvestId);
      if (h) {
        if (!quantity) setQuantity(String(h.quantity));
        if (h.unit) setUnit(h.unit);
        if (!cropId && h.crop_id) setCropId(h.crop_id);
        if (!fieldId && h.field_id) setFieldId(h.field_id);
      }
    }
  };

  // Live calculation previews
  const numQuantity = parseFloat(quantity) || 0;
  const numUnitPrice = parseFloat(unitPrice) || 0;
  const numDiscount = parseFloat(discountAmount) || 0;

  const grossPreview = Math.max(0, numQuantity * numUnitPrice);
  const totalPreview = Math.max(0, grossPreview - numDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form Validations
    if (!farmId) {
      setErrorMessage("Please select a farm estate.");
      return;
    }
    if (!buyerName.trim()) {
      setErrorMessage("Buyer name is required.");
      return;
    }
    if (!productName.trim()) {
      setErrorMessage("Produce / product name is required.");
      return;
    }
    if (numQuantity <= 0) {
      setErrorMessage("Quantity must be strictly greater than zero.");
      return;
    }
    if (numUnitPrice < 0) {
      setErrorMessage("Unit price cannot be negative.");
      return;
    }
    if (numDiscount > grossPreview) {
      setErrorMessage(
        `Discount (₹${numDiscount}) cannot exceed gross amount (₹${grossPreview.toFixed(2)}).`
      );
      return;
    }

    const numInitialPayment = parseFloat(initialPaymentAmount) || 0;
    if (hasInitialPayment) {
      if (numInitialPayment < 0) {
        setErrorMessage("Initial payment amount cannot be negative.");
        return;
      }
      if (numInitialPayment > totalPreview) {
        setErrorMessage(
          `Initial payment (₹${numInitialPayment}) cannot exceed total payable amount (₹${totalPreview.toFixed(2)}).`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      if (isEditing && saleToEdit) {
        const payload: SaleUpdatePayload = {
          sale_date: saleDate,
          buyer_name: buyerName.trim(),
          buyer_phone: buyerPhone.trim() || null,
          buyer_address: buyerAddress.trim() || null,
          product_name: productName.trim(),
          quantity: numQuantity,
          unit: unit.trim().toLowerCase(),
          unit_price: numUnitPrice,
          discount_amount: numDiscount,
          payment_method: paymentMethod || null,
          notes: notes.trim() || null,
        };
        await onSubmit(payload);
      } else {
        const payload: SaleCreatePayload = {
          farm_id: farmId,
          field_id: fieldId || null,
          crop_id: cropId || null,
          harvest_id: harvestId || null,
          sale_number: saleNumber.trim() || null,
          sale_date: saleDate,
          buyer_name: buyerName.trim(),
          buyer_phone: buyerPhone.trim() || null,
          buyer_address: buyerAddress.trim() || null,
          product_name: productName.trim(),
          quantity: numQuantity,
          unit: unit.trim().toLowerCase(),
          unit_price: numUnitPrice,
          discount_amount: numDiscount,
          initial_payment_amount: hasInitialPayment ? numInitialPayment : null,
          payment_method: hasInitialPayment ? paymentMethod : null,
          reference_number: referenceNumber.trim() || null,
          notes: notes.trim() || null,
        };
        await onSubmit(payload);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save sale invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Sale Invoice: ${saleToEdit?.sale_number}` : "Record Produce Sale"}
      description={
        isEditing
          ? "Update quantity, price, buyer details, or notes. Balances will be recalculated."
          : "Record produce sold to wholesalers, mandis, or buyers with verified backend totals."
      }
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Section 1: Origin & Hierarchy */}
        <div className="bg-earth-50/70 p-3.5 rounded-xl border border-earth-200/80">
          <div className="text-xs font-semibold uppercase tracking-wider text-earth-700 mb-2.5 flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-farm-600" />
            <span>1. Produce Origin & Allocation</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Farm */}
            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Farm Estate <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isEditing}
                value={farmId}
                onChange={(e) => {
                  setFarmId(e.target.value);
                  setFieldId("");
                  setCropId("");
                  setHarvestId("");
                }}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white disabled:bg-earth-100"
              >
                <option value="">Select Farm</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Field Plot */}
            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Field Plot <span className="text-earth-400 font-normal">(Optional)</span>
              </label>
              <select
                disabled={isEditing || !farmId}
                value={fieldId}
                onChange={(e) => {
                  setFieldId(e.target.value);
                  setCropId("");
                }}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white disabled:bg-earth-100"
              >
                <option value="">Any Field / All</option>
                {filteredFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Crop Cycle */}
            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Crop Cycle <span className="text-earth-400 font-normal">(Optional)</span>
              </label>
              <select
                disabled={isEditing || !farmId}
                value={cropId}
                onChange={(e) => handleCropChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white disabled:bg-earth-100"
              >
                <option value="">Any Crop</option>
                {filteredCrops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.variety ? `(${c.variety})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Harvest Yield */}
            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Harvest Yield <span className="text-earth-400 font-normal">(Optional)</span>
              </label>
              <select
                disabled={isEditing || !farmId}
                value={harvestId}
                onChange={(e) => handleHarvestChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white disabled:bg-earth-100"
              >
                <option value="">No Direct Harvest Link</option>
                {filteredHarvests.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.batch_number || `Yield on ${h.harvest_date}`} ({h.quantity} {h.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Buyer & Invoice Details */}
        <div className="bg-earth-50/70 p-3.5 rounded-xl border border-earth-200/80">
          <div className="text-xs font-semibold uppercase tracking-wider text-earth-700 mb-2.5 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-farm-600" />
            <span>2. Customer & Invoice Info</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Sale Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Invoice Reference # <span className="text-earth-400 font-normal">(Auto if blank)</span>
              </label>
              <input
                type="text"
                disabled={isEditing}
                placeholder="e.g. SALE-202610-001"
                value={saleNumber}
                onChange={(e) => setSaleNumber(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 disabled:bg-earth-100"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Buyer / Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Metro Agro Mandi"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Buyer Phone Number
              </label>
              <input
                type="tel"
                placeholder="+91-9876543210"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Buyer Address / Mandi Yard Location
              </label>
              <input
                type="text"
                placeholder="Shop number, market yard, or city delivery address"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Produce Quantity & Pricing */}
        <div className="bg-earth-50/70 p-3.5 rounded-xl border border-earth-200/80">
          <div className="text-xs font-semibold uppercase tracking-wider text-earth-700 mb-2.5 flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-farm-600" />
            <span>3. Produce Volume & Pricing</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Produce / Item Sold <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Durum Wheat Grade A"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Unit of Measure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="quintals">Quintals</option>
                <option value="tonnes">Tonnes</option>
                <option value="grams">Grams</option>
                <option value="bags">Bags</option>
                <option value="crates">Crates</option>
                <option value="boxes">Boxes</option>
                <option value="pieces">Pieces</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Unit Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-earth-700 mb-1">
                Trade Discount (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 font-mono"
              />
            </div>

            {/* Calculations Banner */}
            <div className="lg:col-span-4 bg-white p-2.5 rounded-lg border border-earth-200 flex flex-wrap items-center justify-between text-xs font-mono">
              <div>
                <span className="text-earth-500">Gross: </span>
                <span className="font-semibold text-earth-800">₹{grossPreview.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div>
                <span className="text-earth-500">Discount: </span>
                <span className="font-semibold text-amber-600">-₹{numDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="text-sm font-bold text-farm-700">
                <span>Total Payable: </span>
                <span>₹{totalPreview.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Upfront Payment (Only during creation) */}
        {!isEditing && (
          <div className="bg-earth-50/70 p-3.5 rounded-xl border border-earth-200/80">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold uppercase tracking-wider text-earth-800">
                <input
                  type="checkbox"
                  checked={hasInitialPayment}
                  onChange={(e) => setHasInitialPayment(e.target.checked)}
                  className="rounded border-earth-300 text-farm-600 focus:ring-farm-500 h-4 w-4"
                />
                <span>4. Record Upfront Customer Payment Now</span>
              </label>
              {hasInitialPayment && (
                <span className="text-[11px] text-farm-700 font-medium">
                  Ledger will log this installment automatically
                </span>
              )}
            </div>

            {hasInitialPayment && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-earth-700 mb-1">
                    Amount Received (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={totalPreview}
                    required={hasInitialPayment}
                    placeholder="e.g. 5000.00"
                    value={initialPaymentAmount}
                    onChange={(e) => setInitialPaymentAmount(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 font-mono"
                  />
                  <div className="text-[10px] text-earth-500 mt-0.5">
                    Max: ₹{totalPreview.toFixed(2)}
                  </div>
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
                    <option value="cash">Cash in Hand</option>
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="cheque">Bank Cheque</option>
                    <option value="card">Debit / Credit Card</option>
                    <option value="other">Other Payment Mode</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-earth-700 mb-1">
                    Reference / Transaction ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-12345 or Cheque #887"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 5: Commercial Notes */}
        <div>
          <label className="block text-xs font-medium text-earth-700 mb-1">
            Commercial Notes & Quality Observations
          </label>
          <textarea
            rows={2}
            placeholder="Vehicle number, quality specifications, payment terms, or mandi gate pass info..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-earth-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving Invoice...</span>
              </span>
            ) : (
              <span>{isEditing ? "Save Changes" : "Create Sale Invoice"}</span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default SaleFormModal;
