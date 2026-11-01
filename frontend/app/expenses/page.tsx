"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button, ErrorState } from "@/components/ui";
import {
  ExpenseSummaryCards,
  ExpenseFilters,
  ExpenseTable,
  ExpenseFormModal,
  ExpenseDetailsModal,
  RecordExpensePaymentModal,
  DeleteExpenseDialog,
  ExpenseCategoryBadge,
} from "@/components/expenses";
import { expensesApi } from "@/lib/api/expenses";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { cropsApi } from "@/lib/api/crops";
import {
  Expense,
  ExpenseSummary,
  ExpenseCreatePayload,
  ExpenseUpdatePayload,
  ExpensePaymentCreatePayload,
  Farm,
  Field,
  Crop,
} from "@/types";
import {
  Receipt,
  Plus,
  RefreshCw,
  CheckCircle2,
  PieChart,
  BarChart3,
  Layers,
} from "lucide-react";

export default function ExpensesPage() {
  // Filters
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [selectedFieldId, setSelectedFieldId] = useState<string>("");
  const [selectedCropId, setSelectedCropId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data states
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDetailsExpense, setSelectedDetailsExpense] = useState<Expense | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingExpense, setPayingExpense] = useState<Expense | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [expRes, sumRes, farmsRes, fieldsRes, cropsRes] = await Promise.all([
        expensesApi.getExpenses({
          farm_id: selectedFarmId || undefined,
          field_id: selectedFieldId || undefined,
          crop_id: selectedCropId || undefined,
          category: selectedCategory || undefined,
          payment_status: selectedPaymentStatus || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          search: searchQuery.trim() || undefined,
        }),
        expensesApi.getExpenseSummary({
          farm_id: selectedFarmId || undefined,
          field_id: selectedFieldId || undefined,
          crop_id: selectedCropId || undefined,
          category: selectedCategory || undefined,
          payment_status: selectedPaymentStatus || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        farmsApi.getFarms(),
        fieldsApi.getFields(),
        cropsApi.getCrops(),
      ]);

      if (expRes.data) setExpenses(expRes.data);
      if (sumRes.data) setSummary(sumRes.data);
      if (farmsRes.data) setFarms(farmsRes.data);
      if (fieldsRes.data) setFields(fieldsRes.data);
      if (cropsRes.data) setCrops(cropsRes.data);
    } catch (err: any) {
      console.error("Error fetching expenses data:", err);
      setError(err.message || "Failed to load farm expenses. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    selectedFarmId,
    selectedFieldId,
    selectedCropId,
    selectedCategory,
    selectedPaymentStatus,
    startDate,
    endDate,
    searchQuery,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSelectedFarmId("");
    setSelectedFieldId("");
    setSelectedCropId("");
    setSelectedCategory("");
    setSelectedPaymentStatus("");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  // Handle CSV export
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      await expensesApi.exportCsv({
        farm_id: selectedFarmId || undefined,
        field_id: selectedFieldId || undefined,
        crop_id: selectedCropId || undefined,
        category: selectedCategory || undefined,
        payment_status: selectedPaymentStatus || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: searchQuery.trim() || undefined,
      });
      setSuccessBanner("Expenses exported successfully as CSV.");
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to export expenses.");
    } finally {
      setIsExporting(false);
    }
  };

  // Modal handlers
  const handleAddNew = () => {
    setEditingExpense(null);
    setIsFormModalOpen(true);
  };

  const handleEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setIsFormModalOpen(true);
  };

  const handleViewDetails = (exp: Expense) => {
    setSelectedDetailsExpense(exp);
    setIsDetailsModalOpen(true);
  };

  const handleRecordPayment = (exp: Expense) => {
    setPayingExpense(exp);
    setIsPaymentModalOpen(true);
  };

  const handleDelete = (exp: Expense) => {
    setDeletingExpense(exp);
    setIsDeleteDialogOpen(true);
  };

  // Form submit (create or update)
  const handleFormSubmit = async (
    payload: ExpenseCreatePayload | ExpenseUpdatePayload
  ) => {
    if (editingExpense) {
      await expensesApi.updateExpense(editingExpense.id, payload as ExpenseUpdatePayload);
      setSuccessBanner(`Expense "${(payload as ExpenseUpdatePayload).title || editingExpense.title}" updated successfully.`);
    } else {
      await expensesApi.createExpense(payload as ExpenseCreatePayload);
      setSuccessBanner(`New expense "${(payload as ExpenseCreatePayload).title}" recorded successfully.`);
    }
    setTimeout(() => setSuccessBanner(null), 4000);
    await fetchData();
  };

  // Record payment submit
  const handlePaymentSubmit = async (
    expenseId: string,
    payload: ExpensePaymentCreatePayload
  ) => {
    await expensesApi.recordPayment(expenseId, payload);
    setSuccessBanner(`Payment of ₹${payload.amount.toFixed(2)} recorded successfully.`);
    setTimeout(() => setSuccessBanner(null), 4000);
    await fetchData();
  };

  // Delete submit
  const handleDeleteConfirm = async (expenseId: string) => {
    await expensesApi.deleteExpense(expenseId);
    setSuccessBanner("Expense record deleted successfully.");
    setTimeout(() => setSuccessBanner(null), 4000);
    await fetchData();
  };

  const formatInr = (val: number) => {
    return `₹${val.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Farm Expenses"
        description="Record, monitor, categorize, and disburse operational expenses across crops, labour, inputs, fuel, and machinery."
        phaseBadge="Phase 12"
        breadcrumbs={[
          { label: "Financials", href: "/expenses" },
          { label: "Expenses" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="text-earth-700"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddNew}
              className="bg-farm-600 hover:bg-farm-700 text-white font-medium shadow-2xs"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Record Expense
            </Button>
          </div>
        }
      />

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {error ? (
        <ErrorState
          title="Error Loading Expense Records"
          message={error}
          onRetry={fetchData}
        />
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <ExpenseSummaryCards summary={summary} isLoading={isLoading} />

          {/* Category Distribution Comparison Bar */}
          {summary && summary.category_breakdown && summary.category_breakdown.length > 0 && (
            <div className="bg-white rounded-xl border border-earth-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-earth-700 flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-farm-600" />
                  Category Breakdown & Cost Distribution
                </span>
                <span className="text-xs text-earth-500 font-medium">
                  {summary.category_breakdown.length} active cost centers
                </span>
              </div>

              {/* Multi-segment Progress Bar */}
              <div className="h-3.5 w-full bg-earth-100 rounded-full overflow-hidden flex shadow-inner mb-4">
                {summary.category_breakdown.map((item, idx) => {
                  const colors = [
                    "bg-blue-500",
                    "bg-emerald-500",
                    "bg-amber-500",
                    "bg-lime-500",
                    "bg-cyan-500",
                    "bg-orange-500",
                    "bg-indigo-500",
                    "bg-purple-500",
                    "bg-teal-500",
                    "bg-yellow-500",
                    "bg-rose-500",
                  ];
                  const barColor = colors[idx % colors.length];
                  return (
                    <div
                      key={item.category}
                      style={{ width: `${Math.max(item.percentage, 1.5)}%` }}
                      className={`${barColor} transition-all duration-300 hover:opacity-90 relative group`}
                      title={`${item.category_label}: ${formatInr(item.total_amount)} (${item.percentage}%)`}
                    />
                  );
                })}
              </div>

              {/* Category Tags List */}
              <div className="flex flex-wrap gap-2.5">
                {summary.category_breakdown.map((item) => (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(
                        selectedCategory === item.category ? "" : (item.category as string)
                      );
                    }}
                    className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs border transition-all ${
                      selectedCategory === item.category
                        ? "border-farm-600 bg-farm-50 text-farm-900 font-bold ring-2 ring-farm-500/20"
                        : "border-earth-200 bg-earth-50/60 hover:bg-earth-100 text-earth-700"
                    }`}
                  >
                    <ExpenseCategoryBadge category={item.category} size="sm" />
                    <span className="font-mono font-semibold">
                      {formatInr(item.total_amount)}
                    </span>
                    <span className="text-[11px] text-earth-500">
                      ({item.percentage}%)
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <ExpenseFilters
            farms={farms}
            fields={fields}
            crops={crops}
            selectedFarmId={selectedFarmId}
            onSelectFarm={setSelectedFarmId}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            selectedCropId={selectedCropId}
            onSelectCrop={setSelectedCropId}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedPaymentStatus={selectedPaymentStatus}
            onSelectPaymentStatus={setSelectedPaymentStatus}
            startDate={startDate}
            onSelectStartDate={setStartDate}
            endDate={endDate}
            onSelectEndDate={setEndDate}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onReset={handleResetFilters}
            onExportCsv={handleExportCsv}
            isExporting={isExporting}
          />

          {/* Expenses Table */}
          <ExpenseTable
            expenses={expenses}
            isLoading={isLoading}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onRecordPayment={handleRecordPayment}
          />
        </div>
      )}

      {/* Modals */}
      <ExpenseFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingExpense(null);
        }}
        onSubmit={handleFormSubmit}
        editingExpense={editingExpense}
        farms={farms}
        fields={fields}
        crops={crops}
      />

      <ExpenseDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedDetailsExpense(null);
        }}
        expense={selectedDetailsExpense}
        onEdit={(exp) => {
          setIsDetailsModalOpen(false);
          handleEdit(exp);
        }}
        onRecordPayment={(exp) => {
          setIsDetailsModalOpen(false);
          handleRecordPayment(exp);
        }}
      />

      <RecordExpensePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPayingExpense(null);
        }}
        expense={payingExpense}
        onSuccess={handlePaymentSubmit}
      />

      <DeleteExpenseDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setDeletingExpense(null);
        }}
        expense={deletingExpense}
        onConfirm={handleDeleteConfirm}
      />
    </DashboardLayout>
  );
}
