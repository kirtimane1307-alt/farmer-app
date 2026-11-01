"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button, ErrorState } from "@/components/ui";
import { SaleStatusBadge } from "@/components/sales/SaleStatusBadge";
import { RecordSalePaymentModal } from "@/components/sales/RecordSalePaymentModal";
import { DeleteSaleDialog } from "@/components/sales/DeleteSaleDialog";
import { salesApi } from "@/lib/api/sales";
import { Sale, SalePayment, SalePaymentCreatePayload } from "@/types";
import {
  TrendingUp,
  ArrowLeft,
  Calendar,
  User,
  Phone,
  MapPin,
  Package,
  DollarSign,
  Plus,
  Trash2,
  Edit,
  Building,
  Layers,
  Wheat,
  FileText,
  AlertCircle,
  CreditCard,
  Receipt,
  CheckCircle2,
} from "lucide-react";

export default function SaleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const saleId = params?.id as string;

  const [sale, setSale] = useState<Sale | null>(null);
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const fetchSaleData = useCallback(async () => {
    if (!saleId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [saleRes, paymentsRes] = await Promise.all([
        salesApi.getSaleById(saleId),
        salesApi.getSalePayments(saleId),
      ]);

      if (saleRes.error || !saleRes.data) {
        throw new Error(saleRes.error || "Sale not found");
      }

      setSale(saleRes.data);
      setPayments(paymentsRes.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load sale details.");
    } finally {
      setIsLoading(false);
    }
  }, [saleId]);

  useEffect(() => {
    fetchSaleData();
  }, [fetchSaleData]);

  const handleRecordPayment = async (
    targetSaleId: string,
    payload: SalePaymentCreatePayload
  ) => {
    const res = await salesApi.createSalePayment(targetSaleId, payload);
    if (res.error) throw new Error(res.error);

    setSuccessMessage(`Payment of $${Number(payload.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} recorded successfully!`);
    await fetchSaleData();
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!sale) return;
    if (!confirm("Are you sure you want to delete this payment record? This will adjust the sale balance accordingly.")) return;
    
    setDeletingPaymentId(paymentId);
    try {
      const res = await salesApi.deletePayment(sale.id, paymentId);
      if (res.error) {
        alert(res.error);
        return;
      }
      setSuccessMessage("Payment record removed and balance updated.");
      await fetchSaleData();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      alert(err.message || "Failed to delete payment");
    } finally {
      setDeletingPaymentId(null);
    }
  };

  const handleDeleteSale = async () => {
    if (!sale) return;
    const res = await salesApi.deleteSale(sale.id);
    if (res.error) throw new Error(res.error);
    router.push("/sales");
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-sm font-medium text-slate-500">Loading invoice & payment details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !sale) {
    return (
      <DashboardLayout>
        <div className="py-12">
          <ErrorState
            title="Sale Record Not Found"
            message={error || "The requested produce sale does not exist or you lack authorization."}
            onRetry={fetchSaleData}
          />
          <div className="mt-4 text-center">
            <Link
              href="/sales"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Sales Directory
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const grossAmt = Number(sale.gross_amount) || 0;
  const discountAmt = Number(sale.discount_amount) || 0;
  const totalAmt = Number(sale.total_amount) || 0;
  const paidAmt = Number(sale.amount_paid) || 0;
  const balanceAmt = Number(sale.outstanding_amount) || 0;
  const paymentPercentage = totalAmt > 0 ? Math.min(100, Math.round((paidAmt / totalAmt) * 100)) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/sales"
              className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  Sale {sale.sale_number}
                </h1>
                <SaleStatusBadge status={sale.payment_status} />
              </div>
              <p className="text-sm text-slate-500">
                Created on {new Date(sale.created_at).toLocaleDateString()} &middot; ID: {sale.id}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {balanceAmt > 0 && (
              <Button
                variant="primary"
                onClick={() => setIsPaymentModalOpen(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Record Payment
              </Button>
            )}

            <Link href={`/sales/${sale.id}/edit`}>
              <Button variant="secondary" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Sale
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Financial Highlights Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Payable</span>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              ${totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {discountAmt > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                Gross: ${grossAmt.toFixed(2)} &middot; Discount: -${discountAmt.toFixed(2)}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Amount Received</span>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              ${paidAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-emerald-200">
                <div
                  className="h-2 rounded-full bg-emerald-600 transition-all duration-300"
                  style={{ width: `${paymentPercentage}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-emerald-800">{paymentPercentage}%</span>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">Outstanding Balance</span>
            <div className="mt-2 text-2xl font-bold text-amber-700">
              ${balanceAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="mt-1 text-xs text-amber-600">
              {balanceAmt === 0 ? "Fully Settled" : "Awaiting buyer installment"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Invoice Date</span>
            <div className="mt-2 flex items-center gap-2 text-lg font-bold text-slate-900">
              <Calendar className="h-5 w-5 text-slate-400" />
              {new Date(sale.sale_date).toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </div>
            <p className="mt-1 text-xs text-slate-500">Method: {sale.payment_method?.toUpperCase() || "N/A"}</p>
          </div>
        </div>

        {/* Details Grids */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Produce & Origin Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Package className="h-5 w-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-900">Produce & Inventory</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <span className="text-xs text-slate-400">Product Sold</span>
                <p className="text-base font-semibold text-slate-900">{sale.product_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400">Quantity Sold</span>
                  <p className="text-sm font-medium text-slate-900">
                    {Number(sale.quantity).toLocaleString()} {sale.unit}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Unit Price</span>
                  <p className="text-sm font-medium text-slate-900">
                    ${Number(sale.unit_price).toFixed(2)} / {sale.unit}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-500">Farm:</span>
                  <span className="font-medium text-slate-900">{sale.farm_name || "Assigned Farm"}</span>
                </div>
                {sale.field_name && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Layers className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500">Field:</span>
                    <span className="font-medium text-slate-900">{sale.field_name}</span>
                  </div>
                )}
                {sale.crop_name && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Wheat className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500">Crop Batch:</span>
                    <span className="font-medium text-slate-900">{sale.crop_name}</span>
                  </div>
                )}
                {sale.harvest_id && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Package className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500">Harvest Linked:</span>
                    <span className="font-mono text-xs text-slate-600">{sale.harvest_id.slice(0, 8)}...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer / Buyer Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="h-5 w-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-900">Buyer Information</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <span className="text-xs text-slate-400">Buyer / Customer Name</span>
                <p className="text-base font-semibold text-slate-900">{sale.buyer_name}</p>
              </div>

              <div>
                <span className="text-xs text-slate-400">Contact Number</span>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-800">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{sale.buyer_phone || "No phone provided"}</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400">Delivery / Billing Address</span>
                <div className="mt-1 flex items-start gap-2 text-sm text-slate-800">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{sale.buyer_address || "No address on file"}</span>
                </div>
              </div>

              {sale.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-400">Notes & Agreement Terms</span>
                  <p className="mt-1 text-sm italic text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    "{sale.notes}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Calculation Audit Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <h2 className="font-semibold text-slate-900">Invoice Calculation</h2>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between py-1 text-slate-600">
                <span>Gross Produce Value ({sale.quantity} &times; ${Number(sale.unit_price).toFixed(2)})</span>
                <span className="font-medium text-slate-900">${grossAmt.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 text-slate-600">
                <span>Buyer Discount Applied</span>
                <span className="font-medium text-rose-600">-${discountAmt.toFixed(2)}</span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between font-semibold text-slate-900">
                <span>Net Payable Amount</span>
                <span>${totalAmt.toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-1 text-emerald-700">
                <span>Total Recorded Payments</span>
                <span className="font-medium">-${paidAmt.toFixed(2)}</span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-base text-slate-900">
                <span className={balanceAmt > 0 ? "text-amber-700" : "text-emerald-700"}>
                  {balanceAmt > 0 ? "Outstanding Receivable" : "Balance Due"}
                </span>
                <span className={balanceAmt > 0 ? "text-amber-700" : "text-emerald-700"}>
                  ${balanceAmt.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History Ledger */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Payment Installment Ledger</h2>
              <p className="text-xs text-slate-500">
                Audit trail of verified payments received against invoice {sale.sale_number}
              </p>
            </div>
            {balanceAmt > 0 && (
              <Button
                variant="primary"
                onClick={() => setIsPaymentModalOpen(true)}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                Add Installment
              </Button>
            )}
          </div>

          <div className="mt-4">
            {payments.length === 0 ? (
              <div className="py-8 text-center">
                <Receipt className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-700">No payments recorded yet</p>
                <p className="text-xs text-slate-400">
                  Click "Record Payment" to log the initial or partial payment.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Reference #</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {new Date(p.payment_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-emerald-700">
                          ${Number(p.amount).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 uppercase">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {p.reference_number || "—"}
                        </td>
                        <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                          {p.notes || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeletePayment(p.id)}
                            disabled={deletingPaymentId === p.id}
                            className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 disabled:opacity-50"
                            title="Delete payment record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Recording Modal */}
      {isPaymentModalOpen && (
        <RecordSalePaymentModal
          isOpen={isPaymentModalOpen}
          sale={sale}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmit={handleRecordPayment}
        />
      )}

      {/* Delete Sale Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <DeleteSaleDialog
          isOpen={isDeleteDialogOpen}
          sale={sale}
          onClose={() => setIsDeleteDialogOpen(false)}
          onConfirm={handleDeleteSale}
        />
      )}
    </DashboardLayout>
  );
}
