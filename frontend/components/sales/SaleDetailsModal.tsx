import React from "react";
import { Modal, Button } from "@/components/ui";
import { Sale } from "@/types";
import { SaleStatusBadge } from "./SaleStatusBadge";
import {
  TrendingUp,
  Receipt,
  User,
  MapPin,
  Calendar,
  CreditCard,
  Edit2,
  Trash2,
  Phone,
  Package,
  Layers,
  Wheat,
  Clock,
  Plus,
} from "lucide-react";

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onEdit: (sale: Sale) => void;
  onDelete: (sale: Sale) => void;
  onAddPayment: (sale: Sale) => void;
  onDeletePayment?: (sale: Sale, paymentId: string) => void;
}

export function SaleDetailsModal({
  isOpen,
  onClose,
  sale,
  onEdit,
  onDelete,
  onAddPayment,
  onDeletePayment,
}: SaleDetailsModalProps) {
  if (!sale) return null;

  const formatInr = (val: number | undefined | null) => {
    if (val === undefined || val === null) return "₹0.00";
    return `₹${Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Sale Invoice: ${sale.sale_number}`}
      description={`Produce sale recorded on ${formatDate(sale.sale_date)}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Top Header Card: Status & Total Financials */}
        <div className="bg-earth-50 rounded-xl p-4 border border-earth-200">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="font-mono text-sm font-bold text-earth-900">
              {sale.sale_number}
            </span>
            <SaleStatusBadge status={sale.payment_status} size="md" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div>
              <span className="text-earth-500 block text-[11px]">Gross Amount</span>
              <span className="font-semibold text-earth-900 text-sm">
                {formatInr(sale.gross_amount)}
              </span>
            </div>
            <div>
              <span className="text-earth-500 block text-[11px]">Discount</span>
              <span className="font-semibold text-amber-600 text-sm">
                {sale.discount_amount > 0 ? `-${formatInr(sale.discount_amount)}` : "₹0.00"}
              </span>
            </div>
            <div>
              <span className="text-earth-500 block text-[11px]">Final Total</span>
              <span className="font-bold text-farm-700 text-sm">
                {formatInr(sale.total_amount)}
              </span>
            </div>
            <div>
              <span className="text-earth-500 block text-[11px]">Balance Due</span>
              <span
                className={`font-bold text-sm ${
                  sale.outstanding_amount > 0 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {formatInr(sale.outstanding_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* 2-column info layout: Produce & Buyer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Customer / Buyer Information */}
          <div className="bg-white rounded-xl p-3.5 border border-earth-200 space-y-2">
            <div className="font-semibold uppercase tracking-wider text-earth-600 flex items-center gap-1.5 text-[11px]">
              <User className="h-3.5 w-3.5 text-farm-600" />
              <span>Customer / Buyer Info</span>
            </div>
            <div className="text-sm font-bold text-earth-900">{sale.buyer_name}</div>
            {sale.buyer_phone && (
              <div className="text-earth-600 flex items-center gap-1.5">
                <Phone className="h-3 w-3 text-earth-400" />
                <span>{sale.buyer_phone}</span>
              </div>
            )}
            {sale.buyer_address && (
              <div className="text-earth-600 flex items-start gap-1.5">
                <MapPin className="h-3 w-3 text-earth-400 mt-0.5 shrink-0" />
                <span>{sale.buyer_address}</span>
              </div>
            )}
          </div>

          {/* Produce & Origin Information */}
          <div className="bg-white rounded-xl p-3.5 border border-earth-200 space-y-2">
            <div className="font-semibold uppercase tracking-wider text-earth-600 flex items-center gap-1.5 text-[11px]">
              <Package className="h-3.5 w-3.5 text-farm-600" />
              <span>Produce & Origin</span>
            </div>
            <div className="text-sm font-bold text-earth-900">{sale.product_name}</div>
            <div className="text-earth-600">
              Quantity:{" "}
              <strong className="text-earth-800">
                {Number(sale.quantity).toLocaleString("en-IN")} {sale.unit}
              </strong>{" "}
              @ ₹{Number(sale.unit_price).toLocaleString("en-IN")}/{sale.unit}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {sale.farm_name && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-earth-100 text-earth-700 text-[10px]">
                  <MapPin className="h-2.5 w-2.5" /> {sale.farm_name}
                </span>
              )}
              {sale.crop_name && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-farm-50 text-farm-700 text-[10px]">
                  <Wheat className="h-2.5 w-2.5" /> {sale.crop_name}
                </span>
              )}
              {sale.harvest_batch_number && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-harvest-100 text-harvest-800 text-[10px]">
                  <Package className="h-2.5 w-2.5" /> Batch: {sale.harvest_batch_number}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Payment History Ledger */}
        <div className="bg-white rounded-xl p-3.5 border border-earth-200">
          <div className="flex items-center justify-between mb-2.5">
            <div className="font-semibold uppercase tracking-wider text-earth-600 flex items-center gap-1.5 text-[11px]">
              <CreditCard className="h-3.5 w-3.5 text-farm-600" />
              <span>Payment Receipts ({sale.payments?.length || 0})</span>
            </div>
            {sale.outstanding_amount > 0 && (
              <button
                type="button"
                onClick={() => onAddPayment(sale)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                <Plus className="h-3 w-3" />
                <span>Record Payment</span>
              </button>
            )}
          </div>

          {sale.payments && sale.payments.length > 0 ? (
            <div className="divide-y divide-earth-100 border border-earth-200 rounded-lg overflow-hidden text-xs">
              {sale.payments.map((p) => (
                <div
                  key={p.id}
                  className="p-2.5 flex items-center justify-between bg-white hover:bg-earth-50/50"
                >
                  <div>
                    <div className="font-mono font-bold text-emerald-700">
                      {formatInr(p.amount)}
                    </div>
                    <div className="text-[11px] text-earth-500 flex items-center gap-2 mt-0.5">
                      <span>{formatDate(p.payment_date)}</span>
                      <span>•</span>
                      <span className="capitalize">{p.payment_method.replace("_", " ")}</span>
                      {p.reference_number && (
                        <>
                          <span>•</span>
                          <span className="font-mono">Ref: {p.reference_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {onDeletePayment && (
                    <button
                      type="button"
                      onClick={() => onDeletePayment(sale, p.id)}
                      className="text-earth-400 hover:text-rose-600 p-1 transition-colors"
                      title="Remove this payment entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center bg-earth-50 rounded-lg text-earth-500 text-xs">
              No payments collected yet. Outstanding balance is {formatInr(sale.outstanding_amount)}.
            </div>
          )}
        </div>

        {/* Commercial Notes */}
        {sale.notes && (
          <div className="bg-earth-50/70 p-3 rounded-lg border border-earth-200 text-xs text-earth-700">
            <span className="font-semibold text-earth-800 block mb-0.5">
              Commercial Notes:
            </span>
            <p className="whitespace-pre-wrap">{sale.notes}</p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-earth-200">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onDelete(sale)}
            className="text-rose-600 hover:bg-rose-50 border-rose-200"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(sale)}
            >
              <Edit2 className="h-3.5 w-3.5 mr-1" />
              Edit Invoice
            </Button>
            {sale.outstanding_amount > 0 && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => onAddPayment(sale)}
              >
                <CreditCard className="h-3.5 w-3.5 mr-1" />
                Record Payment
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default SaleDetailsModal;
