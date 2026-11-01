import React, { useState } from "react";
import { OtherIncome } from "@/types";
import { IncomeCategoryBadge } from "./IncomeCategoryBadge";
import {
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Coins,
  MapPin,
  Landmark,
} from "lucide-react";

interface IncomeTableProps {
  incomes: OtherIncome[];
  isLoading: boolean;
  onEdit: (income: OtherIncome) => void;
  onDelete: (income: OtherIncome) => void;
}

const ITEMS_PER_PAGE = 10;

export function IncomeTable({
  incomes,
  isLoading,
  onEdit,
  onDelete,
}: IncomeTableProps) {
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

  const totalPages = Math.ceil(incomes.length / ITEMS_PER_PAGE) || 1;
  const paginatedIncomes = incomes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-xs p-8 text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-farm-50 text-farm-600 mb-4 animate-spin">
          <Coins className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-earth-800">
          Loading auxiliary farm income...
        </h3>
        <p className="text-xs text-earth-500 mt-1">
          Retrieving government subsidies, rentals, and other agricultural revenue
        </p>
      </div>
    );
  }

  if (incomes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-earth-200 overflow-hidden shadow-xs p-12 text-center">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-earth-100 text-earth-500 mb-4">
          <Coins className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-earth-800">
          No Auxiliary Income Records
        </h3>
        <p className="text-sm text-earth-500 max-w-md mx-auto mt-1">
          No non-crop farm income matches your filters. Record government subsidies,
          equipment rentals, or other auxiliary revenue sources.
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
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Description & Payer</th>
              <th className="py-3 px-4">Farm Estate</th>
              <th className="py-3 px-4">Method / Ref</th>
              <th className="py-3 px-4 text-right">Amount Received</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-earth-100 text-xs">
            {paginatedIncomes.map((inc) => (
              <tr
                key={inc.id}
                className="hover:bg-earth-50/60 transition-colors group"
              >
                {/* 1. Date */}
                <td className="py-3.5 px-4 font-mono text-earth-700 whitespace-nowrap">
                  {formatDate(inc.income_date)}
                </td>

                {/* 2. Category Badge */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <IncomeCategoryBadge
                    category={inc.category}
                    categoryLabel={inc.category_label}
                    size="sm"
                  />
                </td>

                {/* 3. Description & Payer */}
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-earth-900 line-clamp-1">
                    {inc.description}
                  </div>
                  {inc.source && (
                    <div className="text-[11px] text-earth-500 mt-0.5">
                      Source: <span className="font-medium text-earth-700">{inc.source}</span>
                    </div>
                  )}
                </td>

                {/* 4. Farm Estate */}
                <td className="py-3.5 px-4 whitespace-nowrap text-earth-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-earth-400" />
                    {inc.farm_name || "Farm"}
                  </span>
                </td>

                {/* 5. Method / Ref */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="capitalize text-earth-700">
                    {inc.payment_method?.replace("_", " ") || "Cash"}
                  </div>
                  {inc.reference_number && (
                    <div className="text-[10px] text-earth-400 font-mono mt-0.5">
                      Ref: {inc.reference_number}
                    </div>
                  )}
                </td>

                {/* 6. Amount */}
                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm whitespace-nowrap">
                  +{formatInr(inc.amount)}
                </td>

                {/* 7. Actions */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(inc)}
                      title="Edit Income Record"
                      className="p-1.5 rounded-lg text-earth-500 hover:bg-earth-100 hover:text-earth-800 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(inc)}
                      title="Delete Income Record"
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
              {Math.min(currentPage * ITEMS_PER_PAGE, incomes.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-earth-700">{incomes.length}</span>{" "}
            entries
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

export default IncomeTable;
