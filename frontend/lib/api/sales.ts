/**
 * Farm Produce Sales & Sales Payment API Client for Phase 15.
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import {
  Sale,
  SaleCreatePayload,
  SaleUpdatePayload,
  SaleSummary,
  SalePayment,
  SalePaymentCreatePayload,
  SaleDeleteResponse,
} from "@/types";

export interface SaleFilterParams {
  [key: string]: string | number | boolean | undefined;
  farm_id?: string;
  field_id?: string;
  crop_id?: string;
  harvest_id?: string;
  payment_status?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export const salesApi = {
  /**
   * Retrieve list of sales matching multi-criteria filters.
   */
  async getSales(params?: SaleFilterParams): Promise<ApiResponse<Sale[]>> {
    return apiClient.get<Sale[]>("/sales", params);
  },

  /**
   * Fetch aggregate sales metrics and crop breakdown.
   */
  async getSalesSummary(params?: {
    [key: string]: string | number | boolean | undefined;
    farm_id?: string;
    crop_id?: string;
    payment_status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<SaleSummary>> {
    return apiClient.get<SaleSummary>("/sales/summary", params);
  },

  /**
   * Fetch a single sale record with detailed payment history.
   */
  async getSaleById(id: string): Promise<ApiResponse<Sale>> {
    return apiClient.get<Sale>(`/sales/${id}`);
  },

  /**
   * Record a new produce sale.
   */
  async createSale(payload: SaleCreatePayload): Promise<ApiResponse<Sale>> {
    return apiClient.post<Sale>("/sales", payload);
  },

  /**
   * Modify an existing sale record.
   */
  async updateSale(
    id: string,
    payload: SaleUpdatePayload
  ): Promise<ApiResponse<Sale>> {
    return apiClient.put<Sale>(`/sales/${id}`, payload);
  },

  /**
   * Delete an unpaid sale record.
   */
  async deleteSale(id: string): Promise<ApiResponse<SaleDeleteResponse>> {
    return apiClient.delete<SaleDeleteResponse>(`/sales/${id}`);
  },

  /**
   * Retrieve payment history for a given sale.
   */
  async getSalePayments(saleId: string): Promise<ApiResponse<SalePayment[]>> {
    return apiClient.get<SalePayment[]>(`/sales/${saleId}/payments`);
  },

  /**
   * Record a customer payment installment against an outstanding sale.
   */
  async createSalePayment(
    saleId: string,
    payload: SalePaymentCreatePayload
  ): Promise<ApiResponse<SalePayment>> {
    return apiClient.post<SalePayment>(`/sales/${saleId}/payments`, payload);
  },

  async recordPayment(
    saleId: string,
    payload: SalePaymentCreatePayload
  ): Promise<ApiResponse<SalePayment>> {
    return this.createSalePayment(saleId, payload);
  },

  /**
   * Delete a recorded payment installment.
   */
  async deleteSalePayment(
    saleId: string,
    paymentId: string
  ): Promise<ApiResponse<SaleDeleteResponse>> {
    return apiClient.delete<SaleDeleteResponse>(`/sales/${saleId}/payments/${paymentId}`);
  },

  async deletePayment(
    saleId: string,
    paymentId: string
  ): Promise<ApiResponse<SaleDeleteResponse>> {
    return this.deleteSalePayment(saleId, paymentId);
  },
};

export default salesApi;
