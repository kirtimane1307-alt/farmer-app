import React, { useState } from "react";
import { Sale } from "@/types";
import { SaleStatusBadge } from "./SaleStatusBadge";
import {
  Eye,
  Edit2,
  Trash2,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Receipt,
  Phone,
} from "lucide-react";
import { Button } from "@/components/ui";

interface SaleTableProps {
  sales: Sale[];
  isLoading: boolean;
  onView: (sale: Sale) => void;
  onEdit: (sale: Sale) => void;
  onAddPayment: (sale: Sale) => void;
  onDelete: (sale: Sale) => void;
}

const ITEMS_PER_PAGE = 10;

export function SaleTable({
  sales,
  isLoading,
  onView,
  onEdit,
  onAddPayment,
  onDelete,
}: SaleTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

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

  const totalPages = Math.ceil(sales.length / ITEMS_PER_PAGE) || 1;
  const paginatedSales = sales.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-xs p-8 text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-farm-50 text-farm-600 mb-4 animate-spin">
          <TrendingUp className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-earth-800">
          Loading sales invoices...
        </h3>
        <p className="text-xs text-earth-500 mt-1">
          Retrieving real-time market sales records and payment ledgers
        </p>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-xs p-12 text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-earth-100 text-earth-500 mb-4">
          <Receipt className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-earth-800">
          No Sales Invoices Found
        </h3>
        <p className="text-sm text-earth-500 max-w-md mx-auto mt-1">
          No produce sales match the selected filters. Record a new sale to
          track harvest revenue, payments received, and net farm profit.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-earth-50/80 border-b border-earth-200 text-[11px] font-semibold text-earth-600 uppercase tracking-wider">
              <th className="py-3 px-4">Invoice / Date</th>
              <th className="py-3 px-4">Buyer / Customer</th>
              <th className="py-3 px-4">Produce & Quantity</th>
              <th className="py-3 px-4 text-right">Sale Total</th>
              <th className="py-3 px-4 text-right">Amount Paid</th>
              <th className="py-3 px-4 text-right">Balance</th>
              <th className="py-3 px-4 text-center">Payment Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-earth-100 text-xs">
            {paginatedSales.map((sale) => (
              <tr
                key={sale.id}
                className="hover:bg-earth-50/60 transition-colors group"
              >
                {/* 1. Invoice & Date */}
                <td className="py-3.5 px-4">
                  <div className="font-mono font-semibold text-earth-900 group-hover:text-farm-700 transition-colors">
                    {sale.sale_number}
                  </div>
                  <div className="text-[11px] text-earth-500 mt-0.5">
                    {formatDate(sale.sale_date)}
                  </div>
                  {sale.farm_name && (
                    <div className="text-[10px] text-earth-400 mt-0.5 truncate max-w-[140px]">
                      {sale.farm_name}
                    </div>
                  )}
                </td>

                {/* 2. Buyer Name & Phone */}
                <td className="py-3.5 px-4">
                  <div className="font-medium text-earth-900">{sale.buyer_name}</div>
                  {sale.buyer_phone ? (
                    <div className="text-[11px] text-earth-500 flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 shrink-0 text-earth-400" />
                      {sale.buyer_phone}
                    </div>
                  ) : (
                    <div className="text-[11px] text-earth-400 italic">No contact</div>
                  )}
                </td>

                {/* 3. Produce & Quantity */}
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-earth-900">{sale.product_name}</div>
                  <div className="text-[11px] text-earth-500 mt-0.5 flex items-center gap-1">
                    <span>
                      {Number(sale.quantity).toLocaleString("en-IN")} {sale.unit}
                    </span>
                    <span className="text-earth-400">@</span>
                    <span>₹{Number(sale.unit_price).toLocaleString("en-IN")}/{sale.unit}</span>
                  </div>
                  {sale.crop_name && (
                    <div className="text-[10px] text-farm-700 mt-0.5 font-medium">
                      Crop: {sale.crop_name}
                    </div>
                  )}
                </td>

                {/* 4. Total Amount */}
                <td className="py-3.5 px-4 text-right">
                  <div className="font-bold text-earth-900">
                    {formatInr(sale.total_amount)}
                  </div>
                  {sale.discount_amount > 0 && (
                    <div className="text-[10px] text-amber-600 font-medium">
                      Disc: -₹{Number(sale.discount_amount).toLocaleString("en-IN")}
                    </div>
                  )}
                </td>

                {/* 5. Amount Paid */}
                <td className="py-3.5 px-4 text-right font-medium text-emerald-700">
                  {formatInr(sale.amount_paid)}
                </td>

                {/* 6. Outstanding Balance */}
                <td className="py-3.5 px-4 text-right">
                  <span
                    className={`font-semibold ${
                      sale.outstanding_amount > 0
                        ? "text-amber-700"
                        : "text-earth-400"
                    }`}
                  >
                    {formatInr(sale.outstanding_amount)}
                  </span>
                </td>

                {/* 7. Status */}
                <td className="py-3.5 px-4 text-center">
                  <SaleStatusBadge status={sale.payment_status} size="sm" />
                </td>

                {/* 8. Actions */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* Add Payment action if balance remaining */}
                    {sale.outstanding_amount > 0 && (
                      <button
                        type="button"
                        onClick={() => onAddPayment(sale)}
                        title="Record Payment Installment"
                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                      >
                        <CreditCard className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onView(sale)}
                      title="View Sale Details"
                      className="p-1.5 rounded-lg text-earth-500 hover:bg-earth-100 hover:text-earth-800 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEdit(sale)}
                      title="Edit Sale"
                      className="p-1.5 rounded-lg text-earth-500 hover:bg-earth-100 hover:text-earth-800 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onDelete(sale)}
                      title="Delete Sale"
                      className="p-1.5 rounded-lg text-earth-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="py-3 px-4 border-t border-earth-200 bg-earth-50/50 flex items-center justify-between text-xs text-earth-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-earth-700">
              {(currentPage - 1) * ITEMS_PER_PAGE + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-earth-700">
              {Math.min(currentPage * ITEMS_PER_PAGE, sales.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-earth-700">{sales.length}</span>{" "}
            records
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-earth-300 text-earth-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="px-2 font-medium text-earth-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-earth-300 text-earth-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SaleTable;
