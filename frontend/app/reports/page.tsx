"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import {
  ReportOverviewCards,
  ReportCategorySelector,
  ReportFilterBar,
  ReportPreviewTable,
} from "@/components/reports";
import { reportsApi } from "@/lib/api/reports";
import {
  ReportCategoryKey,
  ReportsOverview,
  UnifiedReportData,
  ReportFilterOptions,
} from "@/types";
import { FileBarChart, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ReportsPage() {
  const [overview, setOverview] = useState<ReportsOverview | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<ReportCategoryKey>("farm_summary");
  const [filters, setFilters] = useState<ReportFilterOptions>({
    category: "farm_summary",
    preset: "all_time",
  });

  const [reportData, setReportData] = useState<UnifiedReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load Overview statistics
  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await reportsApi.getOverview();
      if (res.data) {
        setOverview(res.data);
      }
    } catch (err) {
      console.error("Failed to load reports overview:", err);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  // Generate / Load active report
  const loadReport = useCallback(
    async (optionsToUse?: ReportFilterOptions) => {
      const activeOptions = optionsToUse || filters;
      setLoadingReport(true);
      setErrorMessage(null);

      try {
        const res = await reportsApi.getPreview(activeOptions);
        if (res.data) {
          setReportData(res.data);
        } else if (res.error) {
          setErrorMessage(res.error);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error generating report preview";
        setErrorMessage(msg);
      } finally {
        setLoadingReport(false);
      }
    },
    [filters]
  );

  // Initial load
  useEffect(() => {
    loadOverview();
    loadReport({
      category: "farm_summary",
      preset: "all_time",
    });
  }, [loadOverview, loadReport]);

  // Handle category switch
  const handleCategorySelect = (category: ReportCategoryKey) => {
    setSelectedCategory(category);
    const newFilters: ReportFilterOptions = {
      ...filters,
      category,
      field_id: undefined,
      crop_id: undefined,
      labour_id: undefined,
      expense_category: undefined,
      status: undefined,
    };
    setFilters(newFilters);
    loadReport(newFilters);
  };

  // Handle filter adjustments
  const handleFilterChange = (updated: Partial<ReportFilterOptions>) => {
    setFilters((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  // Reset filters
  const handleResetFilters = () => {
    const defaultFilters: ReportFilterOptions = {
      category: selectedCategory,
      preset: "all_time",
      farm_id: undefined,
      field_id: undefined,
      crop_id: undefined,
      labour_id: undefined,
      expense_category: undefined,
      status: undefined,
      start_date: undefined,
      end_date: undefined,
    };
    setFilters(defaultFilters);
    loadReport(defaultFilters);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Reports Management"
        description="Comprehensive agronomic telemetry, workforce payroll ledgers, and authoritative financial statements generated from actual database records."
        phaseBadge="Phase 18"
        breadcrumbs={[{ label: "Analysis", href: "/reports" }, { label: "Reports" }]}
      />

      {/* 1. Global Overview Cards */}
      <ReportOverviewCards overview={overview} loading={loadingOverview} />

      {/* 2. Category Selection Component */}
      <ReportCategorySelector
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
      />

      {/* 3. Filter System */}
      <ReportFilterBar
        category={selectedCategory}
        filters={filters}
        onFilterChange={handleFilterChange}
        onGenerate={() => loadReport()}
        onReset={handleResetFilters}
        loading={loadingReport}
      />

      {/* 4. Error Message Display */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-6 flex items-start justify-between gap-3 text-rose-800">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-sm font-semibold">Report Generation Error</h5>
              <p className="text-xs text-rose-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadReport()}
            className="border-rose-300 text-rose-700 hover:bg-rose-100 text-xs shrink-0"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </div>
      )}

      {/* 5. Report Preview & Data Table */}
      <ReportPreviewTable
        reportData={reportData}
        filters={filters}
        loading={loadingReport}
      />
    </DashboardLayout>
  );
}
