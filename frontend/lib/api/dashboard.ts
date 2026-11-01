/**
 * Farm Dashboard Analytics API Client for Phase 17: Dashboard Analytics + Recharts.
 */

import { apiClient, ApiResponse } from "@/lib/api/client";

export interface DashboardFilterParams {
  [key: string]: string | number | boolean | undefined;
  farm_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface DashboardKpiSummary {
  total_farms: number;
  total_fields: number;
  active_crops: number;
  total_crops: number;
  total_planted_area: number;
  total_labourers: number;
  active_labourers: number;
  present_today: number;
  attendance_rate: number;
  total_working_hours: number;
  total_working_hours_formatted: string;
  total_sales_revenue: number;
  total_other_income: number;
  total_income: number;
  total_expenses: number;
  net_profit_loss: number;
  is_profit: boolean;
  profit_margin_percentage: number;
}

export interface DashboardFinancialOverview {
  total_sales_revenue: number;
  total_other_income: number;
  total_income: number;
  total_expenses: number;
  net_profit_loss: number;
  is_profit: boolean;
  profit_margin_percentage: number;
  outstanding_receivables: number;
  outstanding_payables: number;
}

export interface IncomeExpenseTrendItem {
  period: string;
  sales_revenue: number;
  other_income: number;
  total_income: number;
  expenses: number;
  net_profit: number;
}

export interface ExpenseCategoryItem {
  category: string;
  label: string;
  amount: number;
  percentage: number;
  record_count: number;
}

export interface AttendanceTrendItem {
  date: string;
  formatted_date: string;
  present_count: number;
  absent_count: number;
  half_day_count: number;
  total_marked: number;
  total_minutes_worked: number;
  total_hours_worked: number;
}

export interface CropDistributionItem {
  crop_id: string;
  name: string;
  variety: string;
  status: string;
  planted_area: number;
  planted_area_unit: string;
  percentage_of_total_area: number;
  farm_name: string;
  field_name: string;
}

export interface HarvestTrendItem {
  period: string;
  total_quantity: number;
  unit: string;
  harvest_count: number;
  crops_harvested: string[];
}

export interface DashboardUpcomingActivity {
  id: string;
  title: string;
  activity_type: string;
  start_datetime: string;
  end_datetime?: string | null;
  priority: string;
  status: string;
  farm_name?: string | null;
  field_name?: string | null;
  crop_name?: string | null;
}

export interface DashboardAnalyticsResponse {
  kpi: DashboardKpiSummary;
  financial_overview: DashboardFinancialOverview;
  income_expense_trend: IncomeExpenseTrendItem[];
  expense_breakdown: ExpenseCategoryItem[];
  attendance_trend: AttendanceTrendItem[];
  crop_distribution: CropDistributionItem[];
  harvest_trend: HarvestTrendItem[];
  upcoming_activities: DashboardUpcomingActivity[];
  selected_farm_id?: string | null;
  selected_farm_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  period_label: string;
}

export const dashboardApi = {
  /**
   * Fetch complete consolidated dashboard analytics with all KPI cards and Recharts datasets.
   */
  async getAnalytics(params?: DashboardFilterParams): Promise<ApiResponse<DashboardAnalyticsResponse>> {
    return apiClient.get<DashboardAnalyticsResponse>("/dashboard/analytics", params);
  },

  /**
   * Fetch top-level high-impact summary metric cards.
   */
  async getSummary(params?: DashboardFilterParams): Promise<ApiResponse<DashboardKpiSummary>> {
    return apiClient.get<DashboardKpiSummary>("/dashboard/summary", params);
  },

  /**
   * Fetch comprehensive financial overview (revenue, other income, expenses, profit/loss, margin).
   */
  async getFinancialOverview(params?: DashboardFilterParams): Promise<ApiResponse<DashboardFinancialOverview>> {
    return apiClient.get<DashboardFinancialOverview>("/dashboard/financial-overview", params);
  },

  /**
   * Fetch multi-period income vs operating expenses trajectory.
   */
  async getIncomeExpenseTrend(params?: DashboardFilterParams): Promise<ApiResponse<IncomeExpenseTrendItem[]>> {
    return apiClient.get<IncomeExpenseTrendItem[]>("/dashboard/income-expense-trend", params);
  },

  /**
   * Fetch category-wise expense breakdown with percentage allocations for pie/donut charts.
   */
  async getExpenseBreakdown(params?: DashboardFilterParams): Promise<ApiResponse<ExpenseCategoryItem[]>> {
    return apiClient.get<ExpenseCategoryItem[]>("/dashboard/expense-breakdown", params);
  },

  /**
   * Fetch daily workforce muster roll and attendance trends.
   */
  async getAttendanceTrend(params?: DashboardFilterParams): Promise<ApiResponse<AttendanceTrendItem[]>> {
    return apiClient.get<AttendanceTrendItem[]>("/dashboard/attendance-trend", params);
  },

  /**
   * Fetch active crop variety acreage distribution.
   */
  async getCropDistribution(params?: DashboardFilterParams): Promise<ApiResponse<CropDistributionItem[]>> {
    return apiClient.get<CropDistributionItem[]>("/dashboard/crop-distribution", params);
  },

  /**
   * Fetch chronological crop yield harvests.
   */
  async getHarvestTrend(params?: DashboardFilterParams): Promise<ApiResponse<HarvestTrendItem[]>> {
    return apiClient.get<HarvestTrendItem[]>("/dashboard/harvest-trend", params);
  },

  /**
   * Fetch impending high-priority farm calendar activities requiring farm owner attention.
   */
  async getUpcomingActivities(params?: DashboardFilterParams): Promise<ApiResponse<DashboardUpcomingActivity[]>> {
    return apiClient.get<DashboardUpcomingActivity[]>("/dashboard/upcoming-activities", params);
  },
};
