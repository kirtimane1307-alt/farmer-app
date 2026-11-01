/**
 * Crop Management API Service Client
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import { Crop, CropCreatePayload, CropUpdatePayload, CropDeleteResponse } from "@/types";

export interface CropFilterParams {
  status?: string;
  field_id?: string;
  farm_id?: string;
  search?: string;
}

export const cropsApi = {
  /**
   * Fetch all crops belonging to the user with optional filters.
   */
  async getCrops(params?: CropFilterParams): Promise<ApiResponse<Crop[]>> {
    return apiClient.get<Crop[]>("/crops", params as Record<string, string | number | boolean | undefined>);
  },

  /**
   * Fetch a single crop cycle by ID.
   */
  async getCrop(cropId: string): Promise<ApiResponse<Crop>> {
    return apiClient.get<Crop>(`/crops/${cropId}`);
  },

  /**
   * Register a new crop cycle on an owned field.
   */
  async createCrop(payload: CropCreatePayload): Promise<ApiResponse<Crop>> {
    return apiClient.post<Crop>("/crops", payload);
  },

  /**
   * Update crop stage, dates, or agronomic metrics.
   */
  async updateCrop(cropId: string, payload: CropUpdatePayload): Promise<ApiResponse<Crop>> {
    return apiClient.put<Crop>(`/crops/${cropId}`, payload);
  },

  /**
   * Delete a crop cycle.
   */
  async deleteCrop(cropId: string): Promise<ApiResponse<CropDeleteResponse>> {
    return apiClient.delete<CropDeleteResponse>(`/crops/${cropId}`);
  },

  /**
   * Fetch all crops recorded under a specific field plot.
   */
  async getCropsForField(fieldId: string): Promise<ApiResponse<Crop[]>> {
    return apiClient.get<Crop[]>(`/fields/${fieldId}/crops`);
  },
};

export default cropsApi;
