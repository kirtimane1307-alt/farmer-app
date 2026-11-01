/**
 * Farm Financial Overview & Profit/Loss API Client for Phase 15.
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import { FinancialSummary } from "@/types";

export interface FinancialSummaryParams {
  [key: string]: string | number | boolean | undefined;
  farm_id?: string;
  start_date?: string;
  end_date?: string;
}

export const financeApi = {
  /**
   * Retrieve authoritative financial summary, combining produce sales,
   * non-crop other income, and operational expenses to calculate profit or loss.
   */
  async getFinancialSummary(
    params?: FinancialSummaryParams
  ): Promise<ApiResponse<FinancialSummary>> {
    return apiClient.get<FinancialSummary>("/financial-summary", params);
  },
};

export default financeApi;
