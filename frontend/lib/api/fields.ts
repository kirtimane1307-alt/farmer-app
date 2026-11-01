/**
 * Field/Plot Management API Service Client
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import { Field } from "@/types";

export interface FieldCreatePayload {
  name: string;
  area: number;
  area_unit: string;
  soil_type?: string;
  irrigation_type?: string;
  description?: string;
}

export interface FieldUpdatePayload {
  name?: string;
  area?: number;
  area_unit?: string;
  soil_type?: string;
  irrigation_type?: string;
  description?: string;
}

export interface FieldDeleteResponse {
  id: string;
  deleted: boolean;
  message: string;
}

export const fieldsApi = {
  /**
   * Fetch all fields under a specific farm.
   */
  async getFieldsForFarm(farmId: string): Promise<ApiResponse<Field[]>> {
    return apiClient.get<Field[]>(`/farms/${farmId}/fields`);
  },

  /**
   * Fetch all fields across all farms owned by current user.
   */
  async getAllFields(): Promise<ApiResponse<Field[]>> {
    return apiClient.get<Field[]>("/fields");
  },

  /**
   * Alias for getAllFields
   */
  async getFields(): Promise<ApiResponse<Field[]>> {
    return this.getAllFields();
  },

  /**
   * Fetch a single field by ID.
   */
  async getField(fieldId: string): Promise<ApiResponse<Field>> {
    return apiClient.get<Field>(`/fields/${fieldId}`);
  },

  /**
   * Create a new field plot under a farm.
   */
  async createField(farmId: string, payload: FieldCreatePayload): Promise<ApiResponse<Field>> {
    return apiClient.post<Field>(`/farms/${farmId}/fields`, payload);
  },

  /**
   * Update an existing field plot.
   */
  async updateField(fieldId: string, payload: FieldUpdatePayload): Promise<ApiResponse<Field>> {
    return apiClient.put<Field>(`/fields/${fieldId}`, payload);
  },

  /**
   * Delete a field plot.
   */
  async deleteField(fieldId: string): Promise<ApiResponse<FieldDeleteResponse>> {
    return apiClient.delete<FieldDeleteResponse>(`/fields/${fieldId}`);
  },
};

export default fieldsApi;
