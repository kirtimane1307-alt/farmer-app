/**
 * Farm Expenses & Disbursements API Service Client
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import {
  Expense,
  ExpenseCreatePayload,
  ExpenseUpdatePayload,
  ExpensePayment,
  ExpensePaymentCreatePayload,
  ExpenseSummary,
  ExpenseDeleteResponse,
} from "@/types";

export interface ExpenseFilterParams {
  [key: string]: string | number | boolean | undefined;
  farm_id?: string;
  field_id?: string;
  crop_id?: string;
  category?: string;
  payment_status?: string;
  vendor_name?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export const expensesApi = {
  /**
   * Retrieve list of expenses matching multi-criteria filters.
   */
  async getExpenses(params?: ExpenseFilterParams): Promise<ApiResponse<Expense[]>> {
    return apiClient.get<Expense[]>("/expenses", params);
  },

  /**
   * Fetch aggregate financial metrics and category breakdown.
   */
  async getExpenseSummary(params?: {
    [key: string]: string | number | boolean | undefined;
    farm_id?: string;
    field_id?: string;
    crop_id?: string;
    category?: string;
    payment_status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<ExpenseSummary>> {
    return apiClient.get<ExpenseSummary>("/expenses/summary", params);
  },

  /**
   * Fetch a single expense with detailed disbursement history.
   */
  async getExpenseById(id: string): Promise<ApiResponse<Expense>> {
    return apiClient.get<Expense>(`/expenses/${id}`);
  },

  /**
   * Create a new farm expense.
   */
  async createExpense(payload: ExpenseCreatePayload): Promise<ApiResponse<Expense>> {
    return apiClient.post<Expense>("/expenses", payload);
  },

  /**
   * Modify an existing expense.
   */
  async updateExpense(
    id: string,
    payload: ExpenseUpdatePayload
  ): Promise<ApiResponse<Expense>> {
    return apiClient.put<Expense>(`/expenses/${id}`, payload);
  },

  /**
   * Safely delete an unpaid expense.
   */
  async deleteExpense(id: string): Promise<ApiResponse<ExpenseDeleteResponse>> {
    return apiClient.delete<ExpenseDeleteResponse>(`/expenses/${id}`);
  },

  /**
   * List payment disbursements for a specific expense.
   */
  async getPayments(expenseId: string): Promise<ApiResponse<ExpensePayment[]>> {
    return apiClient.get<ExpensePayment[]>(`/expenses/${expenseId}/payments`);
  },

  /**
   * Record a payment disbursement against an expense balance.
   */
  async recordPayment(
    expenseId: string,
    payload: ExpensePaymentCreatePayload
  ): Promise<ApiResponse<ExpensePayment>> {
    return apiClient.post<ExpensePayment>(`/expenses/${expenseId}/payments`, payload);
  },

  /**
   * Retrieve all expenses for a specific farm.
   */
  async getExpensesByFarm(
    farmId: string,
    params?: ExpenseFilterParams
  ): Promise<ApiResponse<Expense[]>> {
    return apiClient.get<Expense[]>(`/expenses/farm/${farmId}`, params);
  },

  /**
   * Retrieve all expenses for a specific field plot.
   */
  async getExpensesByField(
    fieldId: string,
    params?: ExpenseFilterParams
  ): Promise<ApiResponse<Expense[]>> {
    return apiClient.get<Expense[]>(`/expenses/field/${fieldId}`, params);
  },

  /**
   * Retrieve all expenses for a specific crop cycle.
   */
  async getExpensesByCrop(
    cropId: string,
    params?: ExpenseFilterParams
  ): Promise<ApiResponse<Expense[]>> {
    return apiClient.get<Expense[]>(`/expenses/crop/${cropId}`, params);
  },

  /**
   * Trigger download of CSV report of filtered expenses.
   */
  async exportCsv(params?: ExpenseFilterParams): Promise<void> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          query.append(k, String(v));
        }
      });
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const url = `http://localhost:8000/api/expenses/export?${query.toString()}`;
    
    // Fetch with authorization header and download blob
    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to export expenses CSV");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `expenses_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};
