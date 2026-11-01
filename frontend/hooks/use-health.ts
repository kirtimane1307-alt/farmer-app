"use client";

import { useState, useEffect, useCallback } from "react";
import { systemService, SystemInfoData, DatabasePingData } from "@/services/api-service";
import { SystemHealth } from "@/types";

export interface UseHealthReturn {
  health: SystemHealth | null;
  dbPing: DatabasePingData | null;
  systemInfo: SystemInfoData | null;
  isLoading: boolean;
  connError: string | null;
  lastChecked: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom React hook for polling and verifying backend API and PostgreSQL database health status.
 */
export function useHealth(): UseHealthReturn {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [dbPing, setDbPing] = useState<DatabasePingData | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfoData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [connError, setConnError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setConnError(null);
    try {
      const [healthRes, pingRes, infoRes] = await Promise.all([
        systemService.checkHealth(),
        systemService.pingDatabase(),
        systemService.getSystemInfo(),
      ]);

      if (healthRes.data) {
        setHealth(healthRes.data);
      } else if (healthRes.error) {
        setConnError(healthRes.error);
      }

      if (pingRes.data) {
        setDbPing(pingRes.data);
      }

      if (infoRes.data) {
        setSystemInfo(infoRes.data);
      }
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: any) {
      setConnError(err?.message || "Failed to reach backend API");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    health,
    dbPing,
    systemInfo,
    isLoading,
    connError,
    lastChecked,
    refetch,
  };
}
