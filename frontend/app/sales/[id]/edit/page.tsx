"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui";
import { salesApi } from "@/lib/api/sales";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { cropsApi } from "@/lib/api/crops";
import { harvestApi } from "@/lib/api/harvest";
import { Farm, Field, Crop, Harvest, Sale, SaleUpdatePayload } from "@/types";
import {
  TrendingUp,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Package,
  User,
  DollarSign,
  Save,
} from "lucide-react";

export default function EditSalePage() {
  const params = useParams();
  const router = useRouter();
  const saleId = params?.id as string;

  const [sale, setSale] = useState<Sale | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [fieldId, setFieldId] = useState("");
  const [cropId, setCropId] = useState("");
  const [harvestId, setHarvestId] = useState("");

  const [saleDate, setSaleDate] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");

  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [unitPrice, setUnitPrice] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadSaleAndOptions() {
      if (!saleId) return;
      setIsLoading(true);
      try {
        const [saleRes, fRes, fiRes, cRes, hRes] = await Promise.all([
          salesApi.getSaleById(saleId),
          farmsApi.getFarms(),
          fieldsApi.getFields(),
          cropsApi.getCrops(),
          harvestApi.getHarvests(),
        ]);

        if (saleRes.error || !saleRes.data) {
          throw new Error(saleRes.error || "Sale not found");
        }

        const s = saleRes.data;
        setSale(s);
        setFarms(fRes.data || []);
        setFields(fiRes.data || []);
        setCrops(cRes.data || []);
        setHarvests(hRes.data || []);

        // Populate fields
        setFieldId(s.field_id || "");
        setCropId(s.crop_id || "");
        setHarvestId(s.harvest_id || "");
        setSaleDate(s.sale_date.split("T")[0]);
        setBuyerName(s.buyer_name);
        setBuyerPhone(s.buyer_phone || "");
        setBuyerAddress(s.buyer_address || "");
        setProductName(s.product_name);
        setQuantity(String(s.quantity));
        setUnit(s.unit);
        setUnitPrice(String(s.unit_price));
        setDiscountAmount(String(s.discount_amount || "0"));
        setPaymentMethod(s.payment_method || "cash");
        setNotes(s.notes || "");
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to load sale data.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSaleAndOptions();
  }, [saleId]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-sm font-medium text-slate-500">Loading sale details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!sale) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">Sale Record Not Found</h2>
          <p className="mt-1 text-sm text-slate-500">{errorMessage || "Invalid sale reference."}</p>
          <div className="mt-4">
            <Link href="/sales" className="text-sm font-medium text-emerald-600 hover:underline">
              Return to Sales List
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const farm = farms.find((f) => f.id === sale.farm_id);
  const filteredFields = fields.filter((f) => f.farm_id === sale.farm_id);
  const filteredCrops = crops.filter((c) => {
    if (fieldId) return c.field_id === fieldId;
    const farmFieldIds = new Set(filteredFields.map((f) => f.id));
    return farmFieldIds.has(c.field_id);
  });
  const filteredHarvests = harvests.filter((h) => {
    if (h.farm_id !== sale.farm_id) return false;
    if (cropId && h.crop_id !== cropId) return false;
    return true;
  });

  const numQuantity = parseFloat(quantity) || 0;
  const numUnitPrice = parseFloat(unitPrice) || 0;
  const numDiscount = parseFloat(discountAmount) || 0;
  const grossPreview = Math.max(0, numQuantity * numUnitPrice);
  const totalPreview = Math.max(0, grossPreview - numDiscount);
  const paidAlready = Number(sale.amount_paid) || 0;
  const newBalancePreview = Math.max(0, totalPreview - paidAlready);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!buyerName.trim()) {
      setErrorMessage("Buyer name is required.");
      return;
    }
    if (!productName.trim()) {
      setErrorMessage("Product name is required.");
      return;
    }
    if (numQuantity <= 0) {
      setErrorMessage("Quantity must be greater than 0.");
      return;
    }
    if (numUnitPrice < 0) {
      setErrorMessage("Unit price cannot be negative.");
      return;
    }
    if (numDiscount < 0) {
      setErrorMessage("Discount cannot be negative.");
      return;
    }
    if (numDiscount > grossPreview) {
      setErrorMessage("Discount cannot exceed gross total amount.");
      return;
    }
    if (totalPreview < paidAlready) {
      setErrorMessage(
        `New total amount ($${totalPreview.toFixed(2)}) cannot be less than already recorded payments ($${paidAlready.toFixed(2)}). Adjust payments first.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: SaleUpdatePayload = {
        sale_date: saleDate,
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim() || null,
        buyer_address: buyerAddress.trim() || null,
        product_name: productName.trim(),
        quantity: numQuantity,
        unit,
        unit_price: numUnitPrice,
        discount_amount: numDiscount,
        payment_method: paymentMethod || null,
        notes: notes.trim() || null,
      };

      const res = await salesApi.updateSale(sale.id, payload);
      if (res.error) {
        setErrorMessage(res.error);
        return;
      }

      router.push(`/sales/${sale.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update sale record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Navigation & Header */}
        <div className="flex items-center gap-4">
          <Link
            href={`/sales/${sale.id}`}
            className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Edit Sale {sale.sale_number}
            </h1>
            <p className="text-sm text-slate-500">
              Farm: <span className="font-semibold text-slate-800">{farm?.name || "Assigned Farm"}</span> &middot; ID: {sale.id}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left 2 Cols: Form Sections */}
            <div className="space-y-6 lg:col-span-2">
              {/* Section 1: Customer Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-semibold text-slate-900">Customer & Buyer Information</h2>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Buyer / Client Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Invoice Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Delivery / Billing Address
                    </label>
                    <input
                      type="text"
                      value={buyerAddress}
                      onChange={(e) => setBuyerAddress(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Produce & Origin */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Package className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-semibold text-slate-900">Produce Details & Provenance</h2>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Field (Optional)
                    </label>
                    <select
                      value={fieldId}
                      onChange={(e) => {
                        setFieldId(e.target.value);
                        setCropId("");
                        setHarvestId("");
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">All Fields</option>
                      {filteredFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Crop Batch (Optional)
                    </label>
                    <select
                      value={cropId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setCropId(cid);
                        const match = crops.find((c) => c.id === cid);
                        if (match) {
                          setProductName(match.name);
                        }
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select Crop...</option>
                      {filteredCrops.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.variety || "Standard"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Harvest Batch (Optional)
                    </label>
                    <select
                      value={harvestId}
                      onChange={(e) => setHarvestId(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select Harvest...</option>
                      {filteredHarvests.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.harvest_date} - {h.crop_name || "Harvest"} ({h.quantity} {h.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Unit of Measure <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="kg">Kilograms (kg)</option>
                      <option value="ton">Metric Tons (ton)</option>
                      <option value="quintal">Quintals (q)</option>
                      <option value="crate">Crates</option>
                      <option value="bag">Bags</option>
                      <option value="box">Boxes</option>
                      <option value="bushel">Bushels</option>
                      <option value="bunch">Bunches</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Quantity Sold <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Unit Price ($) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Discount ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Notes & Terms */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Notes & Terms
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Right 1 Col: Financial Summary Card */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sticky top-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-semibold text-slate-900">Calculation Preview</h2>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Gross Amount</span>
                    <span className="font-semibold text-slate-900">${grossPreview.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Discount</span>
                    <span className="font-semibold text-rose-600">-${numDiscount.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900">
                    <span>Total Payable</span>
                    <span className="text-emerald-700">${totalPreview.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-slate-100 pt-2 flex justify-between text-xs text-slate-500">
                    <span>Payments Already Received</span>
                    <span className="font-medium text-slate-800">${paidAlready.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sm">
                    <span className="text-amber-700">Projected Outstanding</span>
                    <span className="text-amber-700">${newBalancePreview.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Sale Changes
                      </>
                    )}
                  </Button>

                  <Link href={`/sales/${sale.id}`} className="w-full">
                    <Button variant="secondary" type="button" className="w-full">
                      Cancel
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
