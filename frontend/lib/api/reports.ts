/**
 * Reports Management API Client for Phase 18.
 * Connects to FastAPI backend to fetch report overviews, dynamic previews,
 * and handles binary streaming for PDF and Excel report downloads.
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import { config } from "@/lib/config";
import {
  ReportsOverview,
  UnifiedReportData,
  ReportFilterOptions,
} from "@/types";

export const reportsApi = {
  /**
   * Fetch aggregate KPI cards for the reports page header.
   */
  async getOverview(): Promise<ApiResponse<ReportsOverview>> {
    return apiClient.get<ReportsOverview>("/reports/overview");
  },

  /**
   * Generate unified report preview matching active category and filters.
   */
  async getPreview(options: ReportFilterOptions): Promise<ApiResponse<UnifiedReportData>> {
    const params: Record<string, string | number | boolean | undefined> = {
      category: options.category,
      farm_id: options.farm_id,
      field_id: options.field_id,
      crop_id: options.crop_id,
      labour_id: options.labour_id,
      expense_category: options.expense_category,
      status: options.status,
      preset: options.preset,
      start_date: options.start_date,
      end_date: options.end_date,
    };
    return apiClient.get<UnifiedReportData>("/reports/preview", params);
  },

  /**
   * Download a professional PDF report file.
   */
  async downloadPdf(options: ReportFilterOptions): Promise<{ success: boolean; error?: string }> {
    return this.downloadBinaryFile("/reports/export/pdf", options, "pdf");
  },

  /**
   * Download an Excel (.xlsx) report spreadsheet.
   */
  async downloadExcel(options: ReportFilterOptions): Promise<{ success: boolean; error?: string }> {
    return this.downloadBinaryFile("/reports/export/excel", options, "xlsx");
  },

  /**
   * Internal helper to stream binary blobs and trigger browser save-file dialog.
   */
  async downloadBinaryFile(
    endpoint: string,
    options: ReportFilterOptions,
    fileType: "pdf" | "xlsx"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cleanBase = config.api.baseUrl.replace(/\/+$/, "");
      const cleanPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
      const url = new URL(`${cleanBase}${cleanPath}`);

      const params: Record<string, string | undefined> = {
        category: options.category,
        farm_id: options.farm_id,
        field_id: options.field_id,
        crop_id: options.crop_id,
        labour_id: options.labour_id,
        expense_category: options.expense_category,
        status: options.status,
        preset: options.preset,
        start_date: options.start_date,
        end_date: options.end_date,
      };

      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== "") {
          url.searchParams.append(key, String(val));
        }
      });

      const headers: Record<string, string> = {
        "X-Local-Demo": "true",
      };

      if (typeof window !== "undefined") {
        const token = localStorage.getItem("auth_token");
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        let errorMsg = `Download failed with status ${response.status}`;
        try {
          const errJson = await response.json();
          if (errJson.error?.message) {
            errorMsg = errJson.error.message;
          } else if (errJson.detail) {
            errorMsg = errJson.detail;
          }
        } catch {
          // ignore parsing error
        }
        return { success: false, error: errorMsg };
      }

      // Extract filename from header or build sensible default
      let filename = `${options.category}_report_${new Date().toISOString().slice(0, 10)}.${fileType}`;
      const disposition = response.headers.get("content-disposition");
      if (disposition && disposition.includes("filename=")) {
        const matches = disposition.match(/filename="?([^";]+)"?/);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error during report download";
      return { success: false, error: msg };
    }
  },
};

export default reportsApi;

