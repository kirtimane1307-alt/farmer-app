"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button, ErrorState } from "@/components/ui";
import {
  SalarySummaryCards,
  SalaryFilters,
  SalaryTable,
  SalaryGenerateModal,
  RecordPaymentModal,
  SalaryDetailsModal,
  DeleteSalaryDialog,
} from "@/components/salary";
import { salaryApi } from "@/lib/api/salary";
import { labourApi } from "@/lib/api/labour";
import { farmsApi } from "@/lib/api/farms";
import {
  SalaryRecord,
  SalarySummary,
  Labour,
  Farm,
} from "@/types";
import {
  CreditCard,
  Plus,
  RefreshCw,
  Calculator,
} from "lucide-react";

export default function SalaryPage() {
  // Filters
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [selectedLabourId, setSelectedLabourId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data states
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [summary, setSummary] = useState<SalarySummary | null>(null);
  const [workers, setWorkers] = useState<Labour[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedSalaryForPayment, setSelectedSalaryForPayment] = useState<SalaryRecord | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSalaryForDetails, setSelectedSalaryForDetails] = useState<SalaryRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedSalaryForDelete, setSelectedSalaryForDelete] = useState<SalaryRecord | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [salRes, sumRes, workersRes, farmsRes] = await Promise.all([
        salaryApi.getSalaries({
          farm_id: selectedFarmId || undefined,
          labour_id: selectedLabourId || undefined,
          status: selectedStatus || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          search: searchQuery.trim() || undefined,
        }),
        salaryApi.getSalarySummary({
          farm_id: selectedFarmId || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        labourApi.getLabour({
          farm_id: selectedFarmId || undefined,
          status: "active",
        }),
        farmsApi.getFarms(),
      ]);

      if (salRes.error) {
        setError(salRes.error || "Failed to load salary ledger records.");
      } else if (salRes.data) {
        setSalaries(salRes.data);
      }

      if (sumRes.data) {
        setSummary(sumRes.data);
      }

      if (workersRes.data) {
        setWorkers(workersRes.data);
      }

      if (farmsRes.data) {
        setFarms(farmsRes.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedFarmId, selectedLabourId, selectedStatus, startDate, endDate, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleResetFilters = () => {
    setSelectedFarmId("");
    setSelectedLabourId("");
    setSelectedStatus("");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  // Open modals
  const handleOpenPayment = (salary: SalaryRecord) => {
    setSelectedSalaryForPayment(salary);
    setIsPaymentModalOpen(true);
  };

  const handleOpenDetails = (salary: SalaryRecord) => {
    setSelectedSalaryForDetails(salary);
    setIsDetailsModalOpen(true);
  };

  const handleOpenDelete = (salary: SalaryRecord) => {
    setSelectedSalaryForDelete(salary);
    setIsDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Salaries & Labour Payments"
        description="Authoritatively calculate wages based on attendance, overtime, advance payments, and remaining balances."
        phaseBadge="Phase 9"
        breadcrumbs={[{ label: "Workforce", href: "/labour" }, { label: "Salaries" }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="text-earth-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsGenerateModalOpen(true)}
              className="bg-farm-600 hover:bg-farm-700 text-white font-medium shadow-2xs"
            >
              <Calculator className="h-4 w-4 mr-1.5" />
              Calculate & Generate Salary
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorState
          title="Error Loading Salary Records"
          message={error}
          onRetry={fetchData}
        />
      ) : (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <SalarySummaryCards summary={summary} isLoading={isLoading} />

          {/* Filters Bar */}
          <SalaryFilters
            farms={farms}
            labourList={workers}
            selectedFarmId={selectedFarmId}
            onFarmChange={setSelectedFarmId}
            selectedLabourId={selectedLabourId}
            onLabourChange={setSelectedLabourId}
            selectedStatus={selectedStatus}
            onStatusChange={setSelectedStatus}
            startDate={startDate}
            onStartDateChange={setStartDate}
            endDate={endDate}
            onEndDateChange={setEndDate}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onReset={handleResetFilters}
          />

          {/* Salary Table */}
          <SalaryTable
            salaries={salaries}
            isLoading={isLoading}
            onViewDetails={handleOpenDetails}
            onRecordPayment={handleOpenPayment}
            onDeleteSalary={handleOpenDelete}
            onGenerateNew={() => setIsGenerateModalOpen(true)}
          />
        </div>
      )}

      {/* Modals */}
      <SalaryGenerateModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onSalaryCreated={fetchData}
        labourList={workers}
        farms={farms}
      />

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedSalaryForPayment(null);
        }}
        salary={selectedSalaryForPayment}
        onPaymentSuccess={fetchData}
      />

      <SalaryDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedSalaryForDetails(null);
        }}
        salary={selectedSalaryForDetails}
        onDisbursePayment={handleOpenPayment}
      />

      <DeleteSalaryDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedSalaryForDelete(null);
        }}
        salary={selectedSalaryForDelete}
        onSuccess={() => {
          setSelectedSalaryForDelete(null);
          fetchData();
        }}
      />
    </DashboardLayout>
  );
}
