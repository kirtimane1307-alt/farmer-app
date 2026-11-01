import { apiClient, ApiResponse } from "@/lib/api/client";
import {
  CalendarEvent,
  CalendarEventCreatePayload,
  CalendarEventUpdatePayload,
  CalendarEventStatusPayload,
  CalendarSummary,
  CalendarFilterParams,
} from "@/types";

export const calendarApi = {
  /**
   * Retrieve list of calendar activities matching date range and optional filters.
   */
  async getEvents(params?: CalendarFilterParams): Promise<ApiResponse<CalendarEvent[]>> {
    const cleanParams: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.start_date) cleanParams.start_date = params.start_date;
      if (params.end_date) cleanParams.end_date = params.end_date;
      if (params.farm_id) cleanParams.farm_id = params.farm_id;
      if (params.field_id) cleanParams.field_id = params.field_id;
      if (params.crop_id) cleanParams.crop_id = params.crop_id;
      if (params.activity_type) cleanParams.activity_type = params.activity_type;
      if (params.status) cleanParams.status = params.status;
      if (params.priority) cleanParams.priority = params.priority;
      if (params.assigned_labour_id) cleanParams.assigned_labour_id = params.assigned_labour_id;
      if (params.search) cleanParams.search = params.search;
      if (params.skip !== undefined) cleanParams.skip = params.skip;
      if (params.limit !== undefined) cleanParams.limit = params.limit;
    }
    return apiClient.get<CalendarEvent[]>("/calendar/events", cleanParams);
  },

  /**
   * Schedule a new calendar activity.
   */
  async createEvent(payload: CalendarEventCreatePayload): Promise<ApiResponse<CalendarEvent>> {
    return apiClient.post<CalendarEvent>("/calendar/events", payload);
  },

  /**
   * Fetch a single event by UUID.
   */
  async getEventById(id: string): Promise<ApiResponse<CalendarEvent>> {
    return apiClient.get<CalendarEvent>(`/calendar/events/${id}`);
  },

  /**
   * Update full parameters of an existing event.
   */
  async updateEvent(
    id: string,
    payload: CalendarEventUpdatePayload
  ): Promise<ApiResponse<CalendarEvent>> {
    return apiClient.put<CalendarEvent>(`/calendar/events/${id}`, payload);
  },

  /**
   * Fast status transition (e.g. mark completed).
   */
  async updateEventStatus(
    id: string,
    payload: CalendarEventStatusPayload
  ): Promise<ApiResponse<CalendarEvent>> {
    return apiClient.patch<CalendarEvent>(`/calendar/events/${id}/status`, payload);
  },

  /**
   * Safely delete a scheduled activity.
   */
  async deleteEvent(id: string): Promise<ApiResponse<{ success: boolean; message: string; deleted_event_id: string }>> {
    return apiClient.delete<{ success: boolean; message: string; deleted_event_id: string }>(
      `/calendar/events/${id}`
    );
  },

  /**
   * Get aggregated KPI summary counts and activity breakdown.
   */
  async getCalendarSummary(params?: {
    start_date?: string;
    end_date?: string;
    farm_id?: string;
  }): Promise<ApiResponse<CalendarSummary>> {
    const cleanParams: Record<string, string | number | boolean | undefined> = {};
    if (params) {
      if (params.start_date) cleanParams.start_date = params.start_date;
      if (params.end_date) cleanParams.end_date = params.end_date;
      if (params.farm_id) cleanParams.farm_id = params.farm_id;
    }
    return apiClient.get<CalendarSummary>("/calendar/summary", cleanParams);
  },
};

export default calendarApi;
