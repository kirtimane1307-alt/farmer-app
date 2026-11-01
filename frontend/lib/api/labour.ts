/**
 * Labour Management API Service Client
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import {
  Labour,
  LabourCreatePayload,
  LabourUpdatePayload,
  LabourDeleteResponse,
  LabourStats,
} from "@/types";

export interface LabourFilterParams {
  status?: string;
  farm_id?: string;
  work_type?: string;
  search?: string;
}

export const labourApi = {
  /**
   * Fetch all labour records belonging to the current user's farms with optional filters.
   */
  async getLabour(params?: LabourFilterParams): Promise<ApiResponse<Labour[]>> {
    return apiClient.get<Labour[]>("/labour", params as Record<string, string | number | boolean | undefined>);
  },

  /**
   * Fetch aggregate workforce statistics (total, active, inactive).
   */
  async getLabourStats(): Promise<ApiResponse<LabourStats>> {
    return apiClient.get<LabourStats>("/labour/stats");
  },

  /**
   * Fetch a single worker profile by ID.
   */
  async getLabourById(labourId: string): Promise<ApiResponse<Labour>> {
    return apiClient.get<Labour>(`/labour/${labourId}`);
  },

  /**
   * Fetch all workers registered under a specific farm estate.
   */
  async getFarmLabour(farmId: string, status?: string): Promise<ApiResponse<Labour[]>> {
    const params = status ? { status } : undefined;
    return apiClient.get<Labour[]>(`/farms/${farmId}/labour`, params);
  },

  /**
   * Register a new worker profile.
   * If farmId is supplied, uses nested /farms/{farm_id}/labour; otherwise POST /labour.
   */
  async createLabour(payload: LabourCreatePayload, farmId?: string): Promise<ApiResponse<Labour>> {
    if (farmId) {
      return apiClient.post<Labour>(`/farms/${farmId}/labour`, payload);
    }
    return apiClient.post<Labour>("/labour", payload);
  },

  /**
   * Update worker details, daily wage, or status.
   */
  async updateLabour(labourId: string, payload: LabourUpdatePayload): Promise<ApiResponse<Labour>> {
    return apiClient.put<Labour>(`/labour/${labourId}`, payload);
  },

  /**
   * Deactivate (default) or permanently delete a worker record.
   */
  async deactivateLabour(labourId: string, permanent: boolean = false): Promise<ApiResponse<LabourDeleteResponse>> {
    const path = permanent ? `/labour/${labourId}?permanent=true` : `/labour/${labourId}`;
    return apiClient.delete<LabourDeleteResponse>(path);
  },
};

export default labourApi;
