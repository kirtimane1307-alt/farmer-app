/**
 * Equipment & Machinery API Service Client for Phase 13
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import {
  Equipment,
  EquipmentCreatePayload,
  EquipmentUpdatePayload,
  EquipmentStatusUpdatePayload,
  EquipmentMaintenance,
  EquipmentMaintenanceCreatePayload,
  EquipmentMaintenanceUpdatePayload,
  EquipmentSummary,
  EquipmentDeleteResponse,
} from "@/types";

export interface EquipmentFilterParams {
  [key: string]: string | number | boolean | undefined;
  farm_id?: string;
  field_id?: string;
  equipment_type?: string;
  operational_status?: string;
  condition?: string;
  service_status?: string;
  search?: string;
}

export const equipmentApi = {
  /**
   * Retrieve list of equipment matching filters.
   */
  async getEquipment(params?: EquipmentFilterParams): Promise<ApiResponse<Equipment[]>> {
    return apiClient.get<Equipment[]>("/equipment", params);
  },

  /**
   * Fetch aggregate summary metrics, service schedule alerts, and cost breakdowns.
   */
  async getEquipmentSummary(params?: {
    [key: string]: string | number | boolean | undefined;
    farm_id?: string;
    field_id?: string;
  }): Promise<ApiResponse<EquipmentSummary>> {
    return apiClient.get<EquipmentSummary>("/equipment/summary", params);
  },

  /**
   * Fetch single equipment profile with detailed maintenance log.
   */
  async getEquipmentById(id: string): Promise<ApiResponse<Equipment>> {
    return apiClient.get<Equipment>(`/equipment/${id}`);
  },

  /**
   * Register a new piece of farm equipment.
   */
  async createEquipment(payload: EquipmentCreatePayload): Promise<ApiResponse<Equipment>> {
    return apiClient.post<Equipment>("/equipment", payload);
  },

  /**
   * Update equipment details.
   */
  async updateEquipment(
    id: string,
    payload: EquipmentUpdatePayload
  ): Promise<ApiResponse<Equipment>> {
    return apiClient.put<Equipment>(`/equipment/${id}`, payload);
  },

  /**
   * Quickly update equipment operational status and condition.
   */
  async updateEquipmentStatus(
    id: string,
    payload: EquipmentStatusUpdatePayload
  ): Promise<ApiResponse<Equipment>> {
    return apiClient.patch<Equipment>(`/equipment/${id}/status`, payload);
  },

  /**
   * Safely delete equipment record.
   */
  async deleteEquipment(
    id: string,
    force: boolean = false
  ): Promise<ApiResponse<EquipmentDeleteResponse>> {
    const query = force ? "?force=true" : "";
    return apiClient.delete<EquipmentDeleteResponse>(`/equipment/${id}${query}`);
  },

  /**
   * Fetch maintenance history for an equipment item.
   */
  async getEquipmentMaintenance(
    equipmentId: string,
    params?: {
      [key: string]: string | number | boolean | undefined;
      maintenance_type?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<ApiResponse<EquipmentMaintenance[]>> {
    return apiClient.get<EquipmentMaintenance[]>(`/equipment/${equipmentId}/maintenance`, params);
  },

  /**
   * Record new service or repair for an equipment item.
   */
  async createEquipmentMaintenance(
    equipmentId: string,
    payload: EquipmentMaintenanceCreatePayload
  ): Promise<ApiResponse<EquipmentMaintenance>> {
    return apiClient.post<EquipmentMaintenance>(`/equipment/${equipmentId}/maintenance`, payload);
  },

  /**
   * Fetch single maintenance record.
   */
  async getEquipmentMaintenanceById(
    equipmentId: string,
    maintenanceId: string
  ): Promise<ApiResponse<EquipmentMaintenance>> {
    return apiClient.get<EquipmentMaintenance>(
      `/equipment/${equipmentId}/maintenance/${maintenanceId}`
    );
  },

  /**
   * Update an existing maintenance record.
   */
  async updateEquipmentMaintenance(
    equipmentId: string,
    maintenanceId: string,
    payload: EquipmentMaintenanceUpdatePayload
  ): Promise<ApiResponse<EquipmentMaintenance>> {
    return apiClient.put<EquipmentMaintenance>(
      `/equipment/${equipmentId}/maintenance/${maintenanceId}`,
      payload
    );
  },

  /**
   * Delete single maintenance record.
   */
  async deleteEquipmentMaintenance(
    equipmentId: string,
    maintenanceId: string
  ): Promise<ApiResponse<{ id: string; deleted: boolean; message: string }>> {
    return apiClient.delete<{ id: string; deleted: boolean; message: string }>(
      `/equipment/${equipmentId}/maintenance/${maintenanceId}`
    );
  },

  /**
   * Nested route: List equipment for a specific farm.
   */
  async getFarmEquipment(farmId: string): Promise<ApiResponse<Equipment[]>> {
    return apiClient.get<Equipment[]>(`/farms/${farmId}/equipment`);
  },

  /**
   * Nested route: List equipment for a specific field plot.
   */
  async getFieldEquipment(fieldId: string): Promise<ApiResponse<Equipment[]>> {
    return apiClient.get<Equipment[]>(`/fields/${fieldId}/equipment`);
  },
};
