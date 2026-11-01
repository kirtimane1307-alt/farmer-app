"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button, ErrorState } from "@/components/ui";
import {
  IncomeSummaryCards,
  IncomeFilters,
  IncomeTable,
  IncomeFormModal,
  DeleteIncomeDialog,
} from "@/components/income";
import { incomeApi } from "@/lib/api/income";
import { farmsApi } from "@/lib/api/farms";
import {
  OtherIncome,
  OtherIncomeSummary,
  OtherIncomeCreatePayload,
  OtherIncomeUpdatePayload,
  Farm,
} from "@/types";
import {
  Coins,
  Plus,
  RefreshCw,
  CheckCircle2,
  FileBarChart,
  TrendingUp,
} from "lucide-react";

export default function OtherIncomePage() {
  // Filter States
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data States
  const [incomes, setIncomes] = useState<OtherIncome[]>([]);
  const [summary, setSummary] = useState<OtherIncomeSummary | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<OtherIncome | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingIncome, setDeletingIncome] = useState<OtherIncome | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [incomeRes, sumRes, farmsRes] = await Promise.all([
        incomeApi.getIncomes({
          farm_id: selectedFarmId || undefined,
          category: selectedCategory || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          search: searchQuery.trim() || undefined,
        }),
        incomeApi.getIncomeSummary({
          farm_id: selectedFarmId || undefined,
          category: selectedCategory || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        farmsApi.getFarms(),
      ]);

      if (incomeRes.error) throw new Error(incomeRes.error);
      setIncomes(incomeRes.data || []);
      setSummary(sumRes.data || null);
      setFarms(farmsRes.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load farm income records.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedFarmId, selectedCategory, startDate, endDate, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleClearFilters = () => {
    setSelectedFarmId("");
    setSelectedCategory("");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  const handleCreateOrUpdateIncome = async (
    payload: OtherIncomeCreatePayload | OtherIncomeUpdatePayload
  ) => {
    if (editingIncome) {
      const res = await incomeApi.updateIncome(editingIncome.id, payload);
      if (res.error) throw new Error(res.error);
      setSuccessBanner("Income record updated successfully!");
    } else {
      const res = await incomeApi.createIncome(payload as OtherIncomeCreatePayload);
      if (res.error) throw new Error(res.error);
      setSuccessBanner("Non-crop income record created successfully!");
    }
    await fetchData();
    setIsFormModalOpen(false);
    setEditingIncome(null);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleDeleteIncome = async () => {
    if (!deletingIncome) return;
    const res = await incomeApi.deleteIncome(deletingIncome.id);
    if (res.error) throw new Error(res.error);

    setSuccessBanner("Income record deleted successfully.");
    setIsDeleteDialogOpen(false);
    setDeletingIncome(null);
    await fetchData();
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <PageHeader
          title="Other Farm Income"
          description="Track non-crop farm revenues: government subsidies, equipment rentals, insurance claims, and auxiliary agro-services."
          phaseBadge="Phase 15"
          breadcrumbs={[
            { label: "Financials", href: "/financial-overview" },
            { label: "Other Income" },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Link href="/financial-overview">
                <Button variant="secondary" size="sm" className="gap-2">
                  <FileBarChart className="h-4 w-4" />
                  Profit & Loss
                </Button>
              </Link>

              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setEditingIncome(null);
                  setIsFormModalOpen(true);
                }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Add Income
              </Button>
            </div>
          }
        />

        {/* Success Banner */}
        {successBanner && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <ErrorState
            title="Failed to Load Other Income"
            message={error}
            onRetry={fetchData}
          />
        )}

        {/* Summary KPI Cards */}
        <IncomeSummaryCards summary={summary} isLoading={isLoading} />

        {/* Filters */}
        <IncomeFilters
          farms={farms}
          selectedFarmId={selectedFarmId}
          onFarmChange={setSelectedFarmId}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onClearFilters={handleClearFilters}
        />

        {/* Data Table */}
        <IncomeTable
          incomes={incomes}
          isLoading={isLoading}
          onEdit={(income) => {
            setEditingIncome(income);
            setIsFormModalOpen(true);
          }}
          onDelete={(income) => {
            setDeletingIncome(income);
            setIsDeleteDialogOpen(true);
          }}
        />
      </div>

      {/* Income Create / Edit Modal */}
      {isFormModalOpen && (
        <IncomeFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingIncome(null);
          }}
          onSubmit={handleCreateOrUpdateIncome}
          incomeToEdit={editingIncome}
          farms={farms}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && deletingIncome && (
        <DeleteIncomeDialog
          isOpen={isDeleteDialogOpen}
          income={deletingIncome}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingIncome(null);
          }}
          onConfirm={handleDeleteIncome}
        />
      )}
    </DashboardLayout>
  );
}
