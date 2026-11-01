/**
 * Farm Management API Service Client
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import { Farm } from "@/types";

export interface FarmCreatePayload {
  name: string;
  location: string;
  total_area: number;
  area_unit: string;
}

export interface FarmUpdatePayload {
  name?: string;
  location?: string;
  total_area?: number;
  area_unit?: string;
}

export interface FarmDeleteResponse {
  id: string;
  deleted: boolean;
  fields_removed: number;
  message: string;
}

export const farmsApi = {
  /**
   * Fetch all farms owned by the current user.
   */
  async getFarms(): Promise<ApiResponse<Farm[]>> {
    return apiClient.get<Farm[]>("/farms");
  },

  /**
   * Fetch a single farm by its ID.
   */
  async getFarm(farmId: string): Promise<ApiResponse<Farm>> {
    return apiClient.get<Farm>(`/farms/${farmId}`);
  },

  /**
   * Create a new farm.
   */
  async createFarm(payload: FarmCreatePayload): Promise<ApiResponse<Farm>> {
    return apiClient.post<Farm>("/farms", payload);
  },

  /**
   * Update an existing farm.
   */
  async updateFarm(farmId: string, payload: FarmUpdatePayload): Promise<ApiResponse<Farm>> {
    return apiClient.put<Farm>(`/farms/${farmId}`, payload);
  },

  /**
   * Delete a farm and all of its associated fields.
   */
  async deleteFarm(farmId: string): Promise<ApiResponse<FarmDeleteResponse>> {
    return apiClient.delete<FarmDeleteResponse>(`/farms/${farmId}`);
  },
};

export default farmsApi;
