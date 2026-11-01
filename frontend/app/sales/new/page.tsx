"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui";
import { salesApi } from "@/lib/api/sales";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { cropsApi } from "@/lib/api/crops";
import { harvestApi } from "@/lib/api/harvest";
import { Farm, Field, Crop, Harvest, SaleCreatePayload, Sale } from "@/types";
import {
  TrendingUp,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Package,
  User,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

export default function NewSalePage() {
  const router = useRouter();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form State
  const [farmId, setFarmId] = useState("");
  const [fieldId, setFieldId] = useState("");
  const [cropId, setCropId] = useState("");
  const [harvestId, setHarvestId] = useState("");

  const [saleNumber, setSaleNumber] = useState("");
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");

  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [unitPrice, setUnitPrice] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");

  const [hasInitialPayment, setHasInitialPayment] = useState(false);
  const [initialPaymentAmount, setInitialPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [fRes, fiRes, cRes, hRes] = await Promise.all([
          farmsApi.getFarms(),
          fieldsApi.getFields(),
          cropsApi.getCrops(),
          harvestApi.getHarvests(),
        ]);
        setFarms(fRes.data || []);
        setFields(fiRes.data || []);
        setCrops(cRes.data || []);
        setHarvests(hRes.data || []);
        if (fRes.data && fRes.data.length > 0) {
          setFarmId(fRes.data[0].id);
        }
      } catch (err: any) {
        setErrorMessage("Failed to load prerequisite farm options.");
      } finally {
        setIsLoadingData(false);
      }
    }
    loadInitialData();
  }, []);

  const filteredFields = fields.filter((f) => f.farm_id === farmId);
  const filteredCrops = crops.filter((c) => {
    if (fieldId) return c.field_id === fieldId;
    const farmFieldIds = new Set(filteredFields.map((f) => f.id));
    return farmFieldIds.has(c.field_id);
  });
  const filteredHarvests = harvests.filter((h) => {
    if (h.farm_id !== farmId) return false;
    if (cropId && h.crop_id !== cropId) return false;
    return true;
  });

  const numQuantity = parseFloat(quantity) || 0;
  const numUnitPrice = parseFloat(unitPrice) || 0;
  const numDiscount = parseFloat(discountAmount) || 0;
  const grossPreview = Math.max(0, numQuantity * numUnitPrice);
  const totalPreview = Math.max(0, grossPreview - numDiscount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!farmId) {
      setErrorMessage("Please select a farm estate.");
      return;
    }
    if (!buyerName.trim()) {
      setErrorMessage("Buyer name is required.");
      return;
    }
    if (!productName.trim()) {
      setErrorMessage("Produce name is required.");
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
      setErrorMessage("Discount cannot exceed gross amount.");
      return;
    }

    const numInitialPayment = parseFloat(initialPaymentAmount) || 0;
    if (hasInitialPayment && numInitialPayment > totalPreview) {
      setErrorMessage("Initial payment cannot exceed total payable amount.");
      return;
    }

    try {
      setIsSubmitting(true);
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

      const res = await salesApi.createSale(payload);
      if (res.error) throw new Error(res.error);
      const created = res.data as Sale;
      router.push(`/sales/${created.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to create produce sale.");
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Record New Produce Sale"
        description="Issue a new crop market invoice with validated pricing, volume, and customer credit terms."
        phaseBadge="Phase 15"
        breadcrumbs={[
          { label: "Financials", href: "/financial-overview" },
          { label: "Sales", href: "/sales" },
          { label: "New Sale" },
        ]}
        actions={
          <Link href="/sales">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
              Back to Sales
            </Button>
          </Link>
        }
      />

      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-earth-200 p-6 shadow-xs space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Origin & Allocation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-earth-700 flex items-center gap-1.5 border-b border-earth-200 pb-2">
              <Package className="h-4 w-4 text-farm-600" />
              <span>1. Produce Origin & Allocation</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-earth-700 mb-1">
                  Farm Estate <span className="text-rose-500">*</span>
                </label>
                <select
                  value={farmId}
                  onChange={(e) => {
                    setFarmId(e.target.value);
                    setFieldId("");
                    setCropId("");
                    setHarvestId("");
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white"
                >
                  <option value="">Select Farm</option>
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-earth-700 mb-1">
                  Field Plot (Optional)
                </label>
                <select
                  value={fieldId}
                  onChange={(e) => {
                    setFieldId(e.target.value);
                    setCropId("");
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white"
                >
                  <option value="">Any Field</option>
                  {filteredFields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-earth-700 mb-1">
                  Crop Cycle (Optional)
                </label>
                <select
                  value={cropId}
                  onChange={(e) => {
                    setCropId(e.target.value);
                    const selectedCrop = crops.find((c) => c.id === e.target.value);
                    if (selectedCrop && !productName) {
                      setProductName(`${selectedCrop.name} (${selectedCrop.variety})`);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white"
                >
                  <option value="">Any Crop</option>
                  {filteredCrops.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.variety ? `(${c.variety})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-earth-700 mb-1">
                  Harvest Record (Optional)
                </label>
                <select
                  value={harvestId}
                  onChange={(e) => {
                    setHarvestId(e.target.value);
                    const h = harvests.find((item) => item.id === e.target.value);
                    if (h) {
                      if (!quantity) setQuantity(String(h.quantity));
                      if (h.unit) setUnit(h.unit);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500 bg-white"
                >
                  <option value="">No Direct Harvest Link</option>
                  {filteredHarvests.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.batch_number || `Yield ${h.harvest_date}`} ({h.quantity} {h.unit})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Customer & Invoice Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-earth-700 flex items-center gap-1.5 border-b border-earth-200 pb-2">
              <User className="h-4 w-4 text-farm-600" />
              <span>2. Customer & Billing Details</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-earth-700 mb-1">
                  Sale Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-earth-700 mb-1">
                  Buyer / Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metro Mandi Trader"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-medium text-earth-700 mb-1">
                  Buyer Delivery / Yard Address
                </label>
                <input
                  type="text"
                  placeholder="Mandi shop number, yard lane, or wholesale warehouse address"
                  value={buyerAddress}
                  onChange={(e) => setBuyerAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Produce Volume & Pricing */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-earth-700 flex items-center gap-1.5 border-b border-earth-200 pb-2">
              <DollarSign className="h-4 w-4 text-farm-600" />
              <span>3. Produce Volume & Pricing</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-earth-700 mb-1">
                  Product / Produce Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Durum Wheat Malavika"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 focus:outline-none focus:ring-2 focus:ring-farm-500/20 focus:border-farm-500"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-earth-700 mb-1">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 bg-white"
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
                  Price / Unit (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-earth-700 mb-1">
                  Discount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 font-mono"
                />
              </div>

              {/* Calculations Box */}
              <div className="lg:col-span-4 bg-earth-50 p-3 rounded-lg border border-earth-200 flex flex-wrap items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-earth-500">Gross: </span>
                  <span className="font-semibold text-earth-800">
                    ₹{grossPreview.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-earth-500">Discount: </span>
                  <span className="font-semibold text-amber-600">
                    -₹{numDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-sm font-bold text-farm-700">
                  <span>Payable Total: </span>
                  <span>₹{totalPreview.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Upfront Payment */}
          <div className="p-4 bg-earth-50 rounded-xl border border-earth-200 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-wider text-earth-800">
              <input
                type="checkbox"
                checked={hasInitialPayment}
                onChange={(e) => setHasInitialPayment(e.target.checked)}
                className="rounded border-earth-300 text-farm-600 focus:ring-farm-500 h-4 w-4"
              />
              <span>Collect Initial Payment Now</span>
            </label>

            {hasInitialPayment && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
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
                    placeholder="0.00"
                    value={initialPaymentAmount}
                    onChange={(e) => setInitialPaymentAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 font-mono font-bold text-emerald-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-earth-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300 bg-white"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="upi">UPI / Online</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-earth-700 mb-1">
              Commercial Notes & Terms
            </label>
            <textarea
              rows={3}
              placeholder="Gate pass number, truck license plate, payment deadline, or grading remarks..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-earth-300"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-earth-200">
            <Link href="/sales">
              <Button type="button" variant="outline" size="sm">
                Cancel
              </Button>
            </Link>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Recording Sale...</span>
                </span>
              ) : (
                <span>Confirm & Issue Invoice</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
