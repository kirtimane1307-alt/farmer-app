/**
 * Other Farm Income API Client for Phase 15.
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import {
  OtherIncome,
  OtherIncomeCreatePayload,
  OtherIncomeUpdatePayload,
  OtherIncomeSummary,
  IncomeDeleteResponse,
} from "@/types";

export interface IncomeFilterParams {
  [key: string]: string | number | boolean | undefined;
  farm_id?: string;
  category?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export const incomeApi = {
  /**
   * List other farm income entries matching filters.
   */
  async getIncomes(params?: IncomeFilterParams): Promise<ApiResponse<OtherIncome[]>> {
    return apiClient.get<OtherIncome[]>("/income", params);
  },

  /**
   * Fetch aggregate other income totals and category breakdown.
   */
  async getIncomeSummary(params?: {
    [key: string]: string | number | boolean | undefined;
    farm_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<OtherIncomeSummary>> {
    return apiClient.get<OtherIncomeSummary>("/income/summary", params);
  },

  /**
   * Fetch single other income entry by ID.
   */
  async getIncomeById(id: string): Promise<ApiResponse<OtherIncome>> {
    return apiClient.get<OtherIncome>(`/income/${id}`);
  },

  /**
   * Record new other farm income.
   */
  async createIncome(payload: OtherIncomeCreatePayload): Promise<ApiResponse<OtherIncome>> {
    return apiClient.post<OtherIncome>("/income", payload);
  },

  /**
   * Modify an existing other income entry.
   */
  async updateIncome(
    id: string,
    payload: OtherIncomeUpdatePayload
  ): Promise<ApiResponse<OtherIncome>> {
    return apiClient.put<OtherIncome>(`/income/${id}`, payload);
  },

  /**
   * Delete an other income record.
   */
  async deleteIncome(id: string): Promise<ApiResponse<IncomeDeleteResponse>> {
    return apiClient.delete<IncomeDeleteResponse>(`/income/${id}`);
  },
};

export default incomeApi;
