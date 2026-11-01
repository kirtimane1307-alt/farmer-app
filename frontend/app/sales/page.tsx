"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button, ErrorState } from "@/components/ui";
import {
  SaleSummaryCards,
  SaleFilters,
  SaleTable,
  SaleFormModal,
  SaleDetailsModal,
  RecordSalePaymentModal,
  DeleteSaleDialog,
} from "@/components/sales";
import { salesApi } from "@/lib/api/sales";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import { cropsApi } from "@/lib/api/crops";
import { harvestApi } from "@/lib/api/harvest";
import {
  Sale,
  SaleSummary,
  SaleCreatePayload,
  SaleUpdatePayload,
  SalePaymentCreatePayload,
  Farm,
  Field,
  Crop,
  Harvest,
} from "@/types";
import {
  TrendingUp,
  Plus,
  RefreshCw,
  CheckCircle2,
  PieChart,
} from "lucide-react";
import Link from "next/link";

export default function SalesPage() {
  // Filter States
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [selectedCropId, setSelectedCropId] = useState<string>("");
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data States
  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SaleSummary | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDetailsSale, setSelectedDetailsSale] = useState<Sale | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingSale, setPayingSale] = useState<Sale | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [salesRes, sumRes, farmsRes, fieldsRes, cropsRes, harvestsRes] =
        await Promise.all([
          salesApi.getSales({
            farm_id: selectedFarmId || undefined,
            crop_id: selectedCropId || undefined,
            payment_status: selectedPaymentStatus || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
            search: searchQuery.trim() || undefined,
          }),
          salesApi.getSalesSummary({
            farm_id: selectedFarmId || undefined,
            crop_id: selectedCropId || undefined,
            payment_status: selectedPaymentStatus || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined,
          }),
          farmsApi.getFarms(),
          fieldsApi.getFields(),
          cropsApi.getCrops(),
          harvestApi.getHarvests(),
        ]);

      if (salesRes.error) throw new Error(salesRes.error);
      setSales(salesRes.data || []);
      setSummary(sumRes.data || null);
      setFarms(farmsRes.data || []);
      setFields(fieldsRes.data || []);
      setCrops(cropsRes.data || []);
      setHarvests(harvestsRes.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve sales records.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    selectedFarmId,
    selectedCropId,
    selectedPaymentStatus,
    startDate,
    endDate,
    searchQuery,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleClearFilters = () => {
    setSelectedFarmId("");
    setSelectedCropId("");
    setSelectedPaymentStatus("");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  // Actions
  const handleOpenCreateModal = () => {
    setEditingSale(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setIsFormModalOpen(true);
  };

  const handleOpenDetails = (sale: Sale) => {
    setSelectedDetailsSale(sale);
    setIsDetailsModalOpen(true);
  };

  const handleOpenAddPayment = (sale: Sale) => {
    setPayingSale(sale);
    setIsPaymentModalOpen(true);
  };

  const handleOpenDelete = (sale: Sale) => {
    setDeletingSale(sale);
    setIsDeleteDialogOpen(true);
  };

  // Handlers
  const handleSaveSale = async (payload: SaleCreatePayload | SaleUpdatePayload) => {
    if (editingSale) {
      const res = await salesApi.updateSale(editingSale.id, payload as SaleUpdatePayload);
      if (res.error) throw new Error(res.error);
      setSuccessBanner(`Sale invoice ${editingSale.sale_number} successfully updated.`);
    } else {
      const res = await salesApi.createSale(payload as SaleCreatePayload);
      if (res.error) throw new Error(res.error);
      setSuccessBanner(
        `Sale invoice ${(res.data as Sale).sale_number} successfully recorded.`
      );
    }
    fetchData();
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleRecordPayment = async (
    saleId: string,
    payload: SalePaymentCreatePayload
  ) => {
    const res = await salesApi.createSalePayment(saleId, payload);
    if (res.error) throw new Error(res.error);
    setSuccessBanner("Payment receipt recorded successfully.");
    fetchData();
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleDeletePayment = async (sale: Sale, paymentId: string) => {
    const res = await salesApi.deleteSalePayment(sale.id, paymentId);
    if (res.error) {
      alert(res.error);
      return;
    }
    setSuccessBanner("Payment installment removed.");
    // Update active details modal if open
    const updatedSaleRes = await salesApi.getSaleById(sale.id);
    if (updatedSaleRes.data) {
      setSelectedDetailsSale(updatedSaleRes.data);
    }
    fetchData();
    setTimeout(() => setSuccessBanner(null), 4000);
  };

  const handleDeleteSale = async (saleId: string) => {
    const res = await salesApi.deleteSale(saleId);
    if (res.error) throw new Error(res.error);
    setSuccessBanner("Sale invoice permanently removed.");
    fetchData();
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Produce Sales & Income"
        description="Record harvested crop market sales, track buyer invoices, customer receipts, and analyze gross produce revenue."
        phaseBadge="Phase 15"
        breadcrumbs={[
          { label: "Financials", href: "/financial-overview" },
          { label: "Produce Sales" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/financial-overview">
              <Button variant="outline" size="sm">
                <PieChart className="h-3.5 w-3.5 mr-1.5 text-earth-600" />
                Financial Overview
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Record Sale
            </Button>
          </div>
        }
      />

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6">
          <ErrorState message={error} onRetry={fetchData} />
        </div>
      )}

      {/* 1. Summary KPI Cards */}
      <SaleSummaryCards summary={summary} isLoading={isLoading} />

      {/* 2. Filters Bar */}
      <SaleFilters
        farms={farms}
        crops={crops}
        selectedFarmId={selectedFarmId}
        onFarmChange={setSelectedFarmId}
        selectedCropId={selectedCropId}
        onCropChange={setSelectedCropId}
        selectedPaymentStatus={selectedPaymentStatus}
        onPaymentStatusChange={setSelectedPaymentStatus}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearFilters={handleClearFilters}
      />

      {/* 3. Sales Table */}
      <SaleTable
        sales={sales}
        isLoading={isLoading}
        onView={handleOpenDetails}
        onEdit={handleOpenEditModal}
        onAddPayment={handleOpenAddPayment}
        onDelete={handleOpenDelete}
      />

      {/* 4. Modals */}
      <SaleFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleSaveSale}
        saleToEdit={editingSale}
        farms={farms}
        fields={fields}
        crops={crops}
        harvests={harvests}
      />

      <SaleDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        sale={selectedDetailsSale}
        onEdit={(sale) => {
          setIsDetailsModalOpen(false);
          handleOpenEditModal(sale);
        }}
        onDelete={(sale) => {
          setIsDetailsModalOpen(false);
          handleOpenDelete(sale);
        }}
        onAddPayment={(sale) => {
          setIsDetailsModalOpen(false);
          handleOpenAddPayment(sale);
        }}
        onDeletePayment={handleDeletePayment}
      />

      <RecordSalePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        sale={payingSale}
        onSubmit={handleRecordPayment}
      />

      <DeleteSaleDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        sale={deletingSale}
        onConfirm={handleDeleteSale}
      />
    </DashboardLayout>
  );
}
