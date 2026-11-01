"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { DashboardLayout, PageHeader } from "@/components/layout";
import {
  StatCard,
  SectionCard,
  CropDistributionChart,
  IncomeExpenseChart,
  ExpenseCategoryChart,
  AttendanceTrendChart,
  HarvestTrendChart,
  FinancialPerformanceChart,
  DashboardFilters,
  UpcomingActivities,
} from "@/components/dashboard";
import type { DatePresetKey } from "@/components/dashboard/DashboardFilters";
import { Badge, Button } from "@/components/ui";
import { farmsApi } from "@/lib/api/farms";
import { fieldsApi } from "@/lib/api/fields";
import {
  dashboardApi,
  DashboardAnalyticsResponse,
  DashboardFilterParams,
} from "@/lib/api/dashboard";
import { Farm, Field } from "@/types";
import {
  Tractor,
  Layers,
  Wheat,
  Users,
  DollarSign,
  TrendingUp,
  Receipt,
  UserCheck,
  CalendarCheck,
  ArrowRight,
  Sparkles,
  Plus,
  RefreshCw,
  AlertTriangle,
  Droplets,
  CalendarDays,
  CreditCard,
  Wallet,
  Clock,
} from "lucide-react";

export default function DashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter States
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");
  const [selectedPreset, setSelectedPreset] = useState<DatePresetKey>("all_time");
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  // Real Database Entities
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalyticsResponse | null>(null);

  const fetchFarmsAndFields = useCallback(async () => {
    try {
      const [farmsRes, fieldsRes] = await Promise.all([
        farmsApi.getFarms(),
        fieldsApi.getAllFields(),
      ]);
      if (farmsRes.data) setFarms(farmsRes.data);
      if (fieldsRes.data) setFields(fieldsRes.data);
    } catch {
      // Ignore background options failure
    }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      setErrorMessage(null);
      const params: DashboardFilterParams = {};
      if (selectedFarmId) params.farm_id = selectedFarmId;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const res = await dashboardApi.getAnalytics(params);
      if (res.data) {
        setAnalytics(res.data);
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to load dashboard analytics");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFarmId, startDate, endDate]);

  useEffect(() => {
    fetchFarmsAndFields();
  }, [fetchFarmsAndFields]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchFarmsAndFields(), fetchAnalytics()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSelectPreset = (
    preset: DatePresetKey,
    presetStart?: string,
    presetEnd?: string
  ) => {
    setSelectedPreset(preset);
    setStartDate(presetStart);
    setEndDate(presetEnd);
  };

  // Formatter helpers
  const formatCurrency = (amount?: string | number | null) => {
    const val = Number(amount || 0);
    return `₹${val.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  // Current formatted date
  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const kpi = analytics?.kpi;
  const fin = analytics?.financial_overview;

  return (
    <DashboardLayout>
      {/* Page Header */}
      <PageHeader
        title="Farm Operations Dashboard"
        description={`Authoritative real-time telemetry, crop distribution, muster roll, and financial overview across your farm estates • ${todayFormatted}`}
        badge="Live Telemetry"
        breadcrumbs={[{ label: "Dashboard" }]}
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              isLoading={isRefreshing}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Sync Data
            </Button>
            <Link href="/farms">
              <Button variant="primary" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Manage Farms
              </Button>
            </Link>
          </div>
        }
      />

      {/* Hero Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-farm-900 via-farm-800 to-earth-900 p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-farm-700/80 rounded-full px-2.5 py-0.5 text-[11px] font-mono text-farm-200">
              <Sparkles className="h-3 w-3 text-farm-300" />
              AgriCore Farm Management Analytics
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Welcome to the Agricultural Control Center
            </h2>
            <p className="text-xs sm:text-sm text-earth-300 leading-relaxed">
              Real-time operational dashboard connected to your farm database. Monitor land subdivisions, crops, workforce attendance, and financial performance.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/farms">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white text-earth-900 hover:bg-earth-100"
              >
                View Farms ({kpi ? kpi.total_farms : farms.length})
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Filter Scope Controls (Farm Estate & Date Range Presets) */}
      <DashboardFilters
        farms={farms}
        selectedFarmId={selectedFarmId}
        onSelectFarm={setSelectedFarmId}
        selectedPreset={selectedPreset}
        onSelectPreset={handleSelectPreset}
        startDate={startDate}
        endDate={endDate}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Error State Banner if API Fails */}
      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Retry
          </Button>
        </div>
      )}

      {/* Summary Statistic Cards: 8 Authoritative KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* 1. Total Farms */}
        <StatCard
          title="Total Farms"
          value={isLoading ? "..." : String(kpi?.total_farms ?? farms.length)}
          unit={
            kpi && kpi.total_farms > 0
              ? `${Number(kpi.total_planted_area).toFixed(1)} Acres Active`
              : "Registered Estates"
          }
          change={{
            value: kpi?.total_farms ?? farms.length,
            period: "Registered estates",
            isPositiveGood: true,
          }}
          icon={Tractor}
          iconColor="farm"
        />

        {/* 2. Total Fields */}
        <StatCard
          title="Total Fields"
          value={isLoading ? "..." : String(kpi?.total_fields ?? fields.length)}
          unit="Active Field Plots"
          change={{
            value: kpi?.total_fields ?? fields.length,
            period: "Subdivided plots",
            isPositiveGood: true,
          }}
          icon={Layers}
          iconColor="blue"
        />

        {/* 3. Active Crops */}
        <StatCard
          title="Active Crops"
          value={isLoading ? "..." : String(kpi?.active_crops ?? 0)}
          unit={
            kpi && kpi.active_crops > 0
              ? `${Number(kpi.total_planted_area).toFixed(1)} Acres Sown`
              : "No active crops"
          }
          change={{
            value: kpi?.active_crops ?? 0,
            period: "Cultivated cycles",
            isPositiveGood: true,
          }}
          icon={Wheat}
          iconColor="harvest"
        />

        {/* 4. Total Registered Labourers */}
        <StatCard
          title="Workforce"
          value={isLoading ? "..." : String(kpi?.total_labourers ?? 0)}
          unit={
            kpi
              ? `${kpi.active_labourers} Active Personnel`
              : "Registered Workers"
          }
          change={{
            value: kpi?.active_labourers ?? 0,
            period: "Active on roll",
            isPositiveGood: true,
          }}
          icon={Users}
          iconColor="purple"
        />

        {/* 5. Present Labourers or Attendance Rate */}
        <StatCard
          title="Present Today"
          value={isLoading ? "..." : String(kpi?.present_today ?? 0)}
          unit={
            kpi && kpi.total_labourers > 0
              ? `${kpi.attendance_rate}% Attendance (${kpi.total_working_hours_formatted})`
              : "Muster roll status"
          }
          change={{
            value: kpi?.present_today ?? 0,
            period: "Daily attendance",
            isPositiveGood: true,
          }}
          icon={UserCheck}
          iconColor="farm"
        />

        {/* 6. Total Recorded Income */}
        <StatCard
          title="Recorded Income"
          value={isLoading ? "..." : formatCurrency(kpi?.total_income)}
          unit={
            kpi
              ? `Sales: ${formatCurrency(kpi.total_sales_revenue)} | Other: ${formatCurrency(kpi.total_other_income)}`
              : "Produce & Other Revenue"
          }
          change={{
            value: Number(kpi?.total_income || 0),
            period: "Total revenue",
            isPositiveGood: true,
          }}
          icon={TrendingUp}
          iconColor="farm"
        />

        {/* 7. Total Recorded Expenses */}
        <StatCard
          title="Recorded Expenses"
          value={isLoading ? "..." : formatCurrency(kpi?.total_expenses)}
          unit="Operational Outlay"
          change={{
            value: Number(kpi?.total_expenses || 0),
            period: "Total expenses",
            isPositiveGood: false,
          }}
          icon={Receipt}
          iconColor="rose"
        />

        {/* 8. Recorded Profit or Loss */}
        <StatCard
          title="Profit / Loss"
          value={
            isLoading
              ? "..."
              : `${Number(kpi?.net_profit_loss || 0) >= 0 ? "+" : ""}${formatCurrency(kpi?.net_profit_loss)}`
          }
          unit={
            kpi
              ? `Margin: ${kpi.profit_margin_percentage}% (${kpi.is_profit ? "Net Profit" : "Net Loss"})`
              : "Operating outcome"
          }
          change={{
            value: Number(kpi?.net_profit_loss || 0),
            period: kpi?.is_profit ? "Profitable operations" : "Operational deficit",
            isPositiveGood: true,
          }}
          icon={DollarSign}
          iconColor={kpi?.is_profit ? "harvest" : "rose"}
        />
      </div>

      {/* Financial Overview Card */}
      <div className="bg-white rounded-2xl border border-earth-200 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-earth-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-earth-900 tracking-tight">
                Consolidated Financial Overview
              </h3>
              <Badge variant={fin?.is_profit ? "success" : "neutral"} className="text-[10px]">
                {fin?.is_profit ? "Net Surplus" : "Operational Loss"}
              </Badge>
            </div>
            <p className="text-xs text-earth-500 mt-0.5">
              Authoritative financial standing according to verified produce invoices and expense receipts ({analytics?.period_label || "All Time"}).
            </p>
          </div>
          <Link
            href="/sales"
            className="text-xs text-farm-700 hover:text-farm-900 font-medium inline-flex items-center"
          >
            Produce Sales Ledger <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-4 text-xs">
          <div className="p-3 rounded-xl bg-earth-50 border border-earth-100">
            <span className="text-[11px] text-earth-500 block">Sales Revenue</span>
            <span className="text-sm sm:text-base font-bold text-farm-700 block mt-0.5">
              {formatCurrency(fin?.total_sales_revenue)}
            </span>
            <span className="text-[10px] text-earth-400">Produce sales</span>
          </div>

          <div className="p-3 rounded-xl bg-earth-50 border border-earth-100">
            <span className="text-[11px] text-earth-500 block">Other Income</span>
            <span className="text-sm sm:text-base font-bold text-emerald-700 block mt-0.5">
              {formatCurrency(fin?.total_other_income)}
            </span>
            <span className="text-[10px] text-earth-400">Subsidies & rent</span>
          </div>

          <div className="p-3 rounded-xl bg-earth-50 border border-earth-100">
            <span className="text-[11px] text-earth-500 block">Total Income</span>
            <span className="text-sm sm:text-base font-bold text-earth-900 block mt-0.5">
              {formatCurrency(fin?.total_income)}
            </span>
            <span className="text-[10px] text-earth-400">Sales + other</span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50/50 border border-rose-100">
            <span className="text-[11px] text-rose-700 block">Total Expenses</span>
            <span className="text-sm sm:text-base font-bold text-rose-700 block mt-0.5">
              {formatCurrency(fin?.total_expenses)}
            </span>
            <span className="text-[10px] text-rose-400">Operational costs</span>
          </div>

          <div className="p-3 rounded-xl bg-earth-50 border border-earth-100">
            <div className="flex items-center gap-1 text-[11px] text-earth-500">
              <CreditCard className="h-3 w-3 text-amber-600" />
              <span>Receivables</span>
            </div>
            <span className="text-sm sm:text-base font-bold text-amber-700 block mt-0.5">
              {formatCurrency(fin?.outstanding_receivables)}
            </span>
            <span className="text-[10px] text-earth-400">Pending sales pay</span>
          </div>

          <div className="p-3 rounded-xl bg-earth-50 border border-earth-100">
            <div className="flex items-center gap-1 text-[11px] text-earth-500">
              <Wallet className="h-3 w-3 text-blue-600" />
              <span>Payables</span>
            </div>
            <span className="text-sm sm:text-base font-bold text-blue-700 block mt-0.5">
              {formatCurrency(fin?.outstanding_payables)}
            </span>
            <span className="text-[10px] text-earth-400">Vendor balances</span>
          </div>
        </div>
      </div>

      {/* Row 1 of Recharts Visualizations: Financials & Outlays */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Income vs Expenses */}
        <SectionCard
          title="Income vs Expenses Over Time"
          description="Periodic comparison of gross farm receipts vs operating input expenditures."
          badge={
            <Badge variant="neutral" className="font-mono text-[10px]">
              Recharts Telemetry
            </Badge>
          }
          action={
            <Link
              href="/expenses"
              className="text-xs text-farm-700 hover:text-farm-900 font-medium inline-flex items-center"
            >
              Expense Tracker <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          }
        >
          <IncomeExpenseChart
            data={analytics?.income_expense_trend ?? []}
            isLoading={isLoading}
          />
        </SectionCard>

        {/* Chart 2: Expense Category Breakdown */}
        <SectionCard
          title="Expense Category Allocation"
          description="Proportional breakdown of operating expenditures across fertilizer, seeds, labour, and machinery."
          badge={
            <Badge variant="neutral" className="font-mono text-[10px]">
              {analytics?.expense_breakdown?.length ?? 0} Categories
            </Badge>
          }
          action={
            <Link
              href="/expenses"
              className="text-xs text-farm-700 hover:text-farm-900 font-medium inline-flex items-center"
            >
              All Expenses <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          }
        >
          <ExpenseCategoryChart
            data={analytics?.expense_breakdown ?? []}
            isLoading={isLoading}
          />
        </SectionCard>
      </div>

      {/* Row 2 of Recharts Visualizations: Operations & Agronomy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 3: Attendance Trend */}
        <SectionCard
          title="Labour Attendance & Manpower"
          description="Daily workforce muster roll coverage, present counts, and logged operating hours."
          badge={
            <Badge variant="success" className="font-mono text-[10px]">
              Workforce Roll
            </Badge>
          }
          action={
            <Link
              href="/attendance"
              className="text-xs text-farm-700 hover:text-farm-900 font-medium inline-flex items-center"
            >
              Muster Sheet <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          }
        >
          <AttendanceTrendChart
            data={analytics?.attendance_trend ?? []}
            isLoading={isLoading}
          />
        </SectionCard>

        {/* Chart 4: Crop Distribution */}
        <SectionCard
          title="Crop Variety & Acreage Distribution"
          description="Acreage allocation and variety distribution across active cultivated field plots."
          badge={
            <Badge variant="success" className="font-mono text-[10px]">
              {analytics?.crop_distribution?.length ?? 0} Recorded
            </Badge>
          }
          action={
            <Link
              href="/crops"
              className="text-xs text-farm-700 hover:text-farm-900 font-medium inline-flex items-center"
            >
              Manage Crops <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          }
        >
          <CropDistributionChart
            items={analytics?.crop_distribution ?? []}
            isLoading={isLoading}
          />
        </SectionCard>
      </div>

      {/* Row 3 of Recharts Visualizations: Yields & Financial Trajectory */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 5: Harvest Yield Trend */}
        <SectionCard
          title="Harvest Output & Crop Yields"
          description="Recorded crop yields and harvest volume over time."
          badge={
            <Badge variant="neutral" className="font-mono text-[10px]">
              Crop Harvests
            </Badge>
          }
          action={
            <Link
              href="/harvest"
              className="text-xs text-farm-700 hover:text-farm-900 font-medium inline-flex items-center"
            >
              Harvest Logs <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          }
        >
          <HarvestTrendChart
            data={analytics?.harvest_trend ?? []}
            isLoading={isLoading}
          />
        </SectionCard>

        {/* Chart 6: Financial Performance Trajectory */}
        <SectionCard
          title="Financial Performance Trajectory"
          description="Periodic tracking of income, expenses, and net profit margins over time."
          badge={
            <Badge variant="success" className="font-mono text-[10px]">
              Profit / Loss
            </Badge>
          }
          action={
            <Link
              href="/sales"
              className="text-xs text-farm-700 hover:text-farm-900 font-medium inline-flex items-center"
            >
              Sales Ledger <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          }
        >
          <FinancialPerformanceChart
            data={analytics?.income_expense_trend ?? []}
            isLoading={isLoading}
          />
        </SectionCard>
      </div>

      {/* Land Plots & Impending Farm Calendar Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Field Plots Table Preview */}
        <SectionCard
          title="Farm Landholdings & Field Plots"
          description="Registered agricultural plots, soil profiles, and irrigation systems."
          badge={<Badge variant="success">{fields.length} Plots</Badge>}
          action={
            <Link
              href="/fields"
              className="text-xs text-farm-700 hover:text-farm-900 font-medium flex items-center"
            >
              All Fields <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          }
        >
          {fields.length === 0 ? (
            <div className="text-center py-8 text-earth-500 text-xs">
              <Layers className="h-8 w-8 mx-auto text-earth-300 mb-2" />
              <p className="font-semibold text-earth-700">No field plots registered yet</p>
              <p className="mt-1">Add fields under your farms to begin logging crops and soil data.</p>
              <Link href="/fields" className="inline-block mt-3">
                <Button variant="outline" size="sm">Create Field</Button>
              </Link>
            </div>
          ) : (
            <div className="border border-earth-100 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-earth-50 border-b border-earth-100 text-earth-600 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Plot Name</th>
                    <th className="py-2.5 px-3">Area</th>
                    <th className="py-2.5 px-3">Soil Type</th>
                    <th className="py-2.5 px-3">Irrigation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-earth-100 text-earth-700">
                  {fields.slice(0, 5).map((f) => (
                    <tr key={f.id} className="hover:bg-earth-50/50">
                      <td className="py-2.5 px-3 font-medium text-earth-900">{f.name}</td>
                      <td className="py-2.5 px-3">
                        {f.area} {f.area_unit || "Acres"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-earth-100 text-earth-700 text-[11px]">
                          {f.soil_type || "Standard Loam"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 text-[11px] text-blue-700">
                          <Droplets className="h-3 w-3 text-blue-500" />
                          {f.irrigation_type || "Rainfed"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Section G: Upcoming Farm Activities (Phase 16 Calendar) */}
        <SectionCard
          title="Upcoming Farm Activities"
          description="Imminent field operations, irrigation schedules, and crop tasks requiring attention."
          badge={
            <Badge variant="warning" className="text-[10px]">
              {analytics?.upcoming_activities?.length ?? 0} Imminent
            </Badge>
          }
          action={
            <Link
              href="/calendar"
              className="text-xs text-farm-700 hover:text-farm-900 font-medium inline-flex items-center"
            >
              Full Calendar <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          }
        >
          <UpcomingActivities
            activities={analytics?.upcoming_activities ?? []}
            isLoading={isLoading}
          />
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
