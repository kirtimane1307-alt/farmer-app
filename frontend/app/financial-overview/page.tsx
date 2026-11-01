"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Button, ErrorState } from "@/components/ui";
import {
  FinancialKpiCards,
  MonthlyPerformanceChart,
  MonthlyBreakdownTable,
  ProfitLossIndicator,
} from "@/components/finance";
import { financeApi } from "@/lib/api/finance";
import { farmsApi } from "@/lib/api/farms";
import { FinancialSummary, Farm } from "@/types";
import {
  FileBarChart,
  RefreshCw,
  TrendingUp,
  Receipt,
  CreditCard,
  Building,
  Calendar,
  X,
  Filter,
} from "lucide-react";

export default function FinancialOverviewPage() {
  // Filter States
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<string>("all_time");

  // Data States
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFinancials = useCallback(async () => {
    setError(null);
    try {
      const [finRes, farmsRes] = await Promise.all([
        financeApi.getFinancialSummary({
          farm_id: selectedFarmId || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        }),
        farmsApi.getFarms(),
      ]);

      if (finRes.error) throw new Error(finRes.error);
      setSummary(finRes.data || null);
      setFarms(farmsRes.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load financial statement.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedFarmId, startDate, endDate]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchFinancials();
  };

  const handleApplyPreset = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    if (preset === "this_month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(today);
    } else if (preset === "last_month") {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .split("T")[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDayLastMonth);
      setEndDate(lastDayLastMonth);
    } else if (preset === "this_quarter") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const firstDayQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDayQuarter);
      setEndDate(today);
    } else if (preset === "this_year") {
      const firstDayYear = new Date(now.getFullYear(), 0, 1)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDayYear);
      setEndDate(today);
    } else if (preset === "all_time") {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleClearFilters = () => {
    setSelectedFarmId("");
    setStartDate("");
    setEndDate("");
    setDatePreset("all_time");
  };

  const hasActiveFilters = Boolean(selectedFarmId) || Boolean(startDate) || Boolean(endDate);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Page Header */}
        <PageHeader
          title="Financial Overview & Profit / Loss"
          description="Authoritative farm ledger combining Post-Discount Produce Sales, Other Auxiliary Incomes, and Phase 12 Operating Expenses."
          phaseBadge="Phase 15"
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Financial Overview & P&L" },
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

              <Link href="/sales">
                <Button variant="secondary" size="sm" className="gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  Sales Ledger
                </Button>
              </Link>

              <Link href="/income">
                <Button variant="secondary" size="sm" className="gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Other Income
                </Button>
              </Link>

              <Link href="/expenses">
                <Button variant="secondary" size="sm" className="gap-2">
                  <Receipt className="h-4 w-4 text-rose-600" />
                  Expenses
                </Button>
              </Link>
            </div>
          }
        />

        {/* Filter Toolbar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Farm Selector */}
              <div className="min-w-[200px]">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Farm Scope
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={selectedFarmId}
                    onChange={(e) => setSelectedFarmId(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-800 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Consolidated (All Farms)</option>
                    {farms.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDatePreset("custom");
                  }}
                  className="py-1.5 px-3 text-sm rounded-lg border border-slate-200 text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDatePreset("custom");
                  }}
                  className="py-1.5 px-3 text-sm rounded-lg border border-slate-200 text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {hasActiveFilters && (
                <div className="pt-5">
                  <button
                    onClick={handleClearFilters}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    <X className="h-3.5 w-3.5" />
                    Reset
                  </button>
                </div>
              )}
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Period Presets
              </label>
              <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-50 text-xs">
                {[
                  { id: "all_time", label: "All Time" },
                  { id: "this_month", label: "This Month" },
                  { id: "last_month", label: "Last Month" },
                  { id: "this_quarter", label: "This Quarter" },
                  { id: "this_year", label: "YTD" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleApplyPreset(p.id)}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      datePreset === p.id
                        ? "bg-white text-emerald-800 shadow-xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Error Handling */}
        {error && (
          <ErrorState
            title="Failed to Load Financial Summary"
            message={error}
            onRetry={fetchFinancials}
          />
        )}

        {/* KPI Summary Cards */}
        <FinancialKpiCards summary={summary} isLoading={isLoading} />

        {/* Profit/Loss Indicator Banner with Accounting Disclaimers */}
        <ProfitLossIndicator summary={summary} />

        {/* Monthly Performance Chart (Recharts) */}
        <MonthlyPerformanceChart
          data={summary?.monthly_breakdown || []}
          isLoading={isLoading}
        />

        {/* Monthly Breakdown Detailed Table */}
        <MonthlyBreakdownTable
          data={summary?.monthly_breakdown || []}
          isLoading={isLoading}
        />
      </div>
    </DashboardLayout>
  );
}
