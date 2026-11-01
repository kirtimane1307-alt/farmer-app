/**
 * Salary Management & Labour Payments API Service Client
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import {
  SalaryRecord,
  SalaryPreviewPayload,
  SalaryPreviewResponse,
  SalaryCreatePayload,
  SalaryUpdatePayload,
  SalaryPayment,
  SalaryPaymentPayload,
  SalarySummary,
  SalaryDeleteResponse,
} from "@/types";

export interface SalaryFilterParams {
  farm_id?: string;
  labour_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export const salaryApi = {
  /**
   * Retrieve list of salary records with multi-criteria filtering.
   */
  async getSalaries(params?: SalaryFilterParams): Promise<ApiResponse<SalaryRecord[]>> {
    return apiClient.get<SalaryRecord[]>("/salaries", params as Record<string, string | number | boolean | undefined>);
  },

  /**
   * Fetch aggregate salary totals, disbursed amounts, and outstanding balance statistics.
   */
  async getSalarySummary(params?: {
    farm_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<SalarySummary>> {
    return apiClient.get<SalarySummary>("/salaries/summary", params);
  },

  /**
   * Calculate authoritative attendance breakdown and payable wages before persisting.
   */
  async previewSalary(payload: SalaryPreviewPayload): Promise<ApiResponse<SalaryPreviewResponse>> {
    return apiClient.post<SalaryPreviewResponse>("/salaries/preview", payload);
  },

  /**
   * Create, lock historical wage snapshot, and persist permanent salary record.
   */
  async createSalary(payload: SalaryCreatePayload): Promise<ApiResponse<SalaryRecord>> {
    return apiClient.post<SalaryRecord>("/salaries", payload);
  },

  /**
   * Fetch a single salary record with complete attendance breakdown and payment history.
   */
  async getSalaryById(id: string): Promise<ApiResponse<SalaryRecord>> {
    return apiClient.get<SalaryRecord>(`/salaries/${id}`);
  },

  /**
   * Update overtime pay, additional earnings, deductions, or remarks on an existing salary.
   */
  async updateSalary(id: string, payload: SalaryUpdatePayload): Promise<ApiResponse<SalaryRecord>> {
    return apiClient.put<SalaryRecord>(`/salaries/${id}`, payload);
  },

  /**
   * Delete an unpaid salary record (must have zero payments recorded).
   */
  async deleteSalary(id: string): Promise<ApiResponse<SalaryDeleteResponse>> {
    return apiClient.delete<SalaryDeleteResponse>(`/salaries/${id}`);
  },

  /**
   * Fetch disbursement history for a specific salary record.
   */
  async getSalaryPayments(salaryId: string): Promise<ApiResponse<SalaryPayment[]>> {
    return apiClient.get<SalaryPayment[]>(`/salaries/${salaryId}/payments`);
  },

  /**
   * Atomically disburse a payment towards an outstanding salary ledger balance.
   */
  async recordPayment(salaryId: string, payload: SalaryPaymentPayload): Promise<ApiResponse<SalaryPayment>> {
    return apiClient.post<SalaryPayment>(`/salaries/${salaryId}/payments`, payload);
  },

  /**
   * Fetch salary ledger history for a specific worker.
   */
  async getLabourSalaries(labourId: string): Promise<ApiResponse<SalaryRecord[]>> {
    return apiClient.get<SalaryRecord[]>(`/salaries/labour/${labourId}`);
  },
};
