import { apiClient } from "@/lib/api-client";
import { SystemHealth } from "@/types";

export interface SystemInfoData {
  name: string;
  version: string;
  phase: string;
  server_time: string;
  architecture: {
    frontend: string;
    backend: string;
    database: string;
  };
  modules_planned: string[];
}

export interface DatabasePingData {
  database: string;
  connected: boolean;
  latency_ms: number;
  tables_registered: string[];
}

export const systemService = {
  /**
   * Check backend health and database connectivity
   */
  async checkHealth(): Promise<{ data: SystemHealth | null; error: string | null }> {
    const res = await apiClient.get<SystemHealth>("/health");
    return { data: res.data, error: res.error };
  },

  /**
   * Safe probe of database connectivity and latency
   */
  async pingDatabase(): Promise<{ data: DatabasePingData | null; error: string | null }> {
    const res = await apiClient.get<DatabasePingData>("/database/ping");
    return { data: res.data, error: res.error };
  },

  /**
   * Retrieve system architectural metadata and active phase
   */
  async getSystemInfo(): Promise<{ data: SystemInfoData | null; error: string | null }> {
    const res = await apiClient.get<SystemInfoData>("/info");
    return { data: res.data, error: res.error };
  },
};
