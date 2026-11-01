/**
 * Notifications and Reminders API Client for Phase 19.
 * Handles notification retrieval, unread tracking, custom reminder management,
 * user preferences, and manual operational scans.
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import {
  NotificationItem,
  NotificationSummary,
  ReminderItem,
  ReminderCreateInput,
  ReminderUpdateInput,
  NotificationPreferenceItem,
  ScanResults,
} from "@/types";

export interface NotificationFilterParams {
  farm_id?: string;
  category?: string;
  priority?: string;
  is_read?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface ReminderFilterParams {
  farm_id?: string;
  status?: string;
  category?: string;
  priority?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const notificationsApi = {
  /**
   * Fetch paginated list of notifications with optional filters.
   */
  async list(params?: NotificationFilterParams): Promise<ApiResponse<NotificationItem[]>> {
    return apiClient.get<NotificationItem[]>("/notifications", params as Record<string, any>);
  },

  /**
   * Get telemetry summary (unread count, urgent, active/overdue reminders).
   */
  async getSummary(farmId?: string): Promise<ApiResponse<NotificationSummary>> {
    const params = farmId ? { farm_id: farmId } : undefined;
    return apiClient.get<NotificationSummary>("/notifications/summary", params);
  },

  /**
   * Mark a single notification as read.
   */
  async markAsRead(notificationId: string): Promise<ApiResponse<NotificationItem>> {
    return apiClient.patch<NotificationItem>(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all unread notifications matching criteria as read.
   */
  async markAllAsRead(farmId?: string, category?: string): Promise<ApiResponse<{ updated_count: number }>> {
    const searchParams = new URLSearchParams();
    if (farmId) searchParams.append("farm_id", farmId);
    if (category) searchParams.append("category", category);
    const qs = searchParams.toString();
    const path = qs ? `/notifications/mark-all-read?${qs}` : "/notifications/mark-all-read";
    return apiClient.post<{ updated_count: number }>(path);
  },

  /**
   * Delete a notification owned by the current user.
   */
  async delete(notificationId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.delete<{ deleted: boolean }>(`/notifications/${notificationId}`);
  },

  /**
   * Trigger an on-demand scan of real farm data and generate notifications.
   */
  async triggerScan(): Promise<ApiResponse<ScanResults>> {
    return apiClient.post<ScanResults>("/notifications/scan");
  },
};

export const remindersApi = {
  /**
   * Fetch list of user reminders with filtering.
   */
  async list(params?: ReminderFilterParams): Promise<ApiResponse<ReminderItem[]>> {
    return apiClient.get<ReminderItem[]>("/reminders", params as Record<string, any>);
  },

  /**
   * Get single reminder by ID.
   */
  async getById(reminderId: string): Promise<ApiResponse<ReminderItem>> {
    return apiClient.get<ReminderItem>(`/reminders/${reminderId}`);
  },

  /**
   * Create a new custom reminder.
   */
  async create(data: ReminderCreateInput): Promise<ApiResponse<ReminderItem>> {
    return apiClient.post<ReminderItem>("/reminders", data);
  },

  /**
   * Update an existing reminder.
   */
  async update(reminderId: string, data: ReminderUpdateInput): Promise<ApiResponse<ReminderItem>> {
    return apiClient.put<ReminderItem>(`/reminders/${reminderId}`, data);
  },

  /**
   * Mark a reminder completed (supports recurring roll-over).
   */
  async complete(reminderId: string): Promise<ApiResponse<ReminderItem>> {
    return apiClient.patch<ReminderItem>(`/reminders/${reminderId}/complete`);
  },

  /**
   * Delete a reminder.
   */
  async delete(reminderId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiClient.delete<{ deleted: boolean }>(`/reminders/${reminderId}`);
  },
};

export const notificationPreferencesApi = {
  /**
   * Fetch user notification preferences across all 11 categories.
   */
  async get(): Promise<ApiResponse<NotificationPreferenceItem[]>> {
    return apiClient.get<NotificationPreferenceItem[]>("/notification-preferences");
  },

  /**
   * Update user preferences and advance notice windows.
   */
  async update(preferences: NotificationPreferenceItem[]): Promise<ApiResponse<NotificationPreferenceItem[]>> {
    return apiClient.put<NotificationPreferenceItem[]>("/notification-preferences", { preferences });
  },
};
