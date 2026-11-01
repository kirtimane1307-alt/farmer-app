/**
 * Agricultural Applications (Fertilizer & Pesticide) API Service Client
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import {
  AgriculturalApplication,
  ApplicationCreatePayload,
  ApplicationUpdatePayload,
  ApplicationSummary,
  ApplicationDeleteResponse,
} from "@/types";

export interface ApplicationFilterParams {
  category?: string;
  farm_id?: string;
  field_id?: string;
  crop_id?: string;
  start_date?: string;
  end_date?: string;
  product_type?: string;
  search?: string;
}

export const applicationsApi = {
  /**
   * Retrieve list of applications with multi-criteria filtering.
   */
  async getApplications(params?: ApplicationFilterParams): Promise<ApiResponse<AgriculturalApplication[]>> {
    return apiClient.get<AgriculturalApplication[]>(
      "/applications",
      params as Record<string, string | number | boolean | undefined>
    );
  },

  /**
   * Fetch aggregate cost and count statistics for fertilizer and pesticide applications.
   */
  async getApplicationSummary(params?: {
    farm_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<ApplicationSummary>> {
    return apiClient.get<ApplicationSummary>("/applications/summary", params);
  },

  /**
   * Fetch a single application record by UUID.
   */
  async getApplicationById(id: string): Promise<ApiResponse<AgriculturalApplication>> {
    return apiClient.get<AgriculturalApplication>(`/applications/${id}`);
  },

  /**
   * Create a new fertilizer or pesticide application.
   */
  async createApplication(payload: ApplicationCreatePayload): Promise<ApiResponse<AgriculturalApplication>> {
    return apiClient.post<AgriculturalApplication>("/applications", payload);
  },

  /**
   * Update an existing application record.
   */
  async updateApplication(
    id: string,
    payload: ApplicationUpdatePayload
  ): Promise<ApiResponse<AgriculturalApplication>> {
    return apiClient.put<AgriculturalApplication>(`/applications/${id}`, payload);
  },

  /**
   * Delete an application record.
   */
  async deleteApplication(id: string): Promise<ApiResponse<ApplicationDeleteResponse>> {
    return apiClient.delete<ApplicationDeleteResponse>(`/applications/${id}`);
  },

  /**
   * Fetch applications for a specific farm.
   */
  async getFarmApplications(
    farmId: string,
    category?: string
  ): Promise<ApiResponse<AgriculturalApplication[]>> {
    const params = category ? { category } : undefined;
    return apiClient.get<AgriculturalApplication[]>(`/applications/farm/${farmId}`, params);
  },

  /**
   * Fetch applications for a specific field.
   */
  async getFieldApplications(
    fieldId: string,
    category?: string
  ): Promise<ApiResponse<AgriculturalApplication[]>> {
    const params = category ? { category } : undefined;
    return apiClient.get<AgriculturalApplication[]>(`/applications/field/${fieldId}`, params);
  },

  /**
   * Fetch applications for a specific crop cycle.
   */
  async getCropApplications(
    cropId: string,
    category?: string
  ): Promise<ApiResponse<AgriculturalApplication[]>> {
    const params = category ? { category } : undefined;
    return apiClient.get<AgriculturalApplication[]>(`/applications/crop/${cropId}`, params);
  },
};
