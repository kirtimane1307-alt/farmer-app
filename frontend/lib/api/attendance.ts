/**
 * Attendance Management API Service Client
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import {
  Attendance,
  AttendanceCreatePayload,
  AttendanceUpdatePayload,
  BulkAttendancePayload,
  BulkAttendanceResponse,
  AttendanceDailySummary,
} from "@/types";

export interface AttendanceFilterParams {
  date?: string;
  start_date?: string;
  end_date?: string;
  farm_id?: string;
  labour_id?: string;
  status?: string;
  search?: string;
}

export const attendanceApi = {
  /**
   * Fetch all attendance records with optional filtering (date, farm, worker, status, search).
   */
  async getAttendance(params?: AttendanceFilterParams): Promise<ApiResponse<Attendance[]>> {
    return apiClient.get<Attendance[]>("/attendance", params as Record<string, string | number | boolean | undefined>);
  },

  /**
   * Fetch aggregate daily attendance breakdown and working hours for a given date.
   */
  async getAttendanceSummary(date?: string, farmId?: string): Promise<ApiResponse<AttendanceDailySummary>> {
    const params: Record<string, string | undefined> = {};
    if (date) params.date = date;
    if (farmId) params.farm_id = farmId;
    return apiClient.get<AttendanceDailySummary>("/attendance/summary", params);
  },

  /**
   * Fetch all attendance records for a specific date.
   */
  async getAttendanceByDate(attendanceDate: string, farmId?: string): Promise<ApiResponse<Attendance[]>> {
    const params = farmId ? { farm_id: farmId } : undefined;
    return apiClient.get<Attendance[]>(`/attendance/date/${attendanceDate}`, params);
  },

  /**
   * Fetch a single attendance log by ID.
   */
  async getAttendanceById(attendanceId: string): Promise<ApiResponse<Attendance>> {
    return apiClient.get<Attendance>(`/attendance/${attendanceId}`);
  },

  /**
   * Fetch full attendance timeline for a specific worker.
   */
  async getWorkerAttendance(
    labourId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<Attendance[]>> {
    const params: Record<string, string | undefined> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    return apiClient.get<Attendance[]>(`/labour/${labourId}/attendance`, params);
  },

  /**
   * Record attendance for a single worker.
   */
  async createAttendance(payload: AttendanceCreatePayload): Promise<ApiResponse<Attendance>> {
    return apiClient.post<Attendance>("/attendance", payload);
  },

  /**
   * Update an existing attendance record (times, status, overtime).
   */
  async updateAttendance(
    attendanceId: string,
    payload: AttendanceUpdatePayload
  ): Promise<ApiResponse<Attendance>> {
    return apiClient.put<Attendance>(`/attendance/${attendanceId}`, payload);
  },

  /**
   * Delete an attendance record.
   */
  async deleteAttendance(attendanceId: string): Promise<ApiResponse<{ id: string; deleted: boolean; message: string }>> {
    return apiClient.delete<{ id: string; deleted: boolean; message: string }>(`/attendance/${attendanceId}`);
  },

  /**
   * Submit daily muster sheet for multiple workers simultaneously.
   */
  async submitBulkAttendance(payload: BulkAttendancePayload): Promise<ApiResponse<BulkAttendanceResponse>> {
    return apiClient.post<BulkAttendanceResponse>("/attendance/bulk", payload);
  },
};

export default attendanceApi;
