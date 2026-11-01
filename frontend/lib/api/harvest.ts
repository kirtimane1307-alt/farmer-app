/**
 * Harvest API Service Client for Phase 14: Harvest Management
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import {
  Harvest,
  HarvestFormData,
  HarvestFilterParams,
  HarvestSummary,
  HarvestDeleteResponse,
} from "@/types";

export interface HarvestQueryParams {
  [key: string]: string | number | boolean | undefined;
  farm_id?: string;
  field_id?: string;
  crop_id?: string;
  start_date?: string;
  end_date?: string;
  unit?: string;
  quality_grade?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export const harvestApi = {
  /**
   * Retrieve list of crop harvests matching filters.
   */
  async getHarvests(params?: HarvestQueryParams): Promise<ApiResponse<Harvest[]>> {
    return apiClient.get<Harvest[]>("/harvests", params);
  },

  /**
   * Fetch aggregate yield summaries, metric calculations, and crop/field rollups.
   */
  async getHarvestSummary(params?: {
    [key: string]: string | number | boolean | undefined;
    farm_id?: string;
    field_id?: string;
    crop_id?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<HarvestSummary>> {
    return apiClient.get<HarvestSummary>("/harvests/summary", params);
  },

  /**
   * Fetch single harvest record details.
   */
  async getHarvestById(id: string): Promise<ApiResponse<Harvest>> {
    return apiClient.get<Harvest>(`/harvests/${id}`);
  },

  /**
   * Record a new harvest yield.
   */
  async createHarvest(payload: HarvestFormData): Promise<ApiResponse<Harvest>> {
    return apiClient.post<Harvest>("/harvests", payload);
  },

  /**
   * Update an existing harvest record.
   */
  async updateHarvest(id: string, payload: Partial<HarvestFormData>): Promise<ApiResponse<Harvest>> {
    return apiClient.put<Harvest>(`/harvests/${id}`, payload);
  },

  /**
   * Delete a harvest record.
   */
  async deleteHarvest(id: string): Promise<ApiResponse<HarvestDeleteResponse>> {
    return apiClient.delete<HarvestDeleteResponse>(`/harvests/${id}`);
  },

  /**
   * Convenience route: Fetch harvests for a specific farm.
   */
  async getFarmHarvests(farmId: string): Promise<ApiResponse<Harvest[]>> {
    return apiClient.get<Harvest[]>(`/farms/${farmId}/harvests`);
  },

  /**
   * Convenience route: Fetch harvests for a specific field plot.
   */
  async getFieldHarvests(fieldId: string): Promise<ApiResponse<Harvest[]>> {
    return apiClient.get<Harvest[]>(`/fields/${fieldId}/harvests`);
  },

  /**
   * Convenience route: Fetch harvests for a specific crop cycle.
   */
  async getCropHarvests(cropId: string): Promise<ApiResponse<Harvest[]>> {
    return apiClient.get<Harvest[]>(`/crops/${cropId}/harvests`);
  },
};
