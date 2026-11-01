/**
 * Application Configuration
 * Provides centralized access to environment variables, API endpoints, and system settings.
 */

export const config = {
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
    timeoutMs: 15000,
  },
  app: {
    name: "AgriCore Farm Management System",
    shortName: "AgriCore",
    version: "1.0.0",
    currentPhase: "Phase 3: Frontend Foundation & UI Shell",
  },
  pagination: {
    defaultPageSize: 10,
    maxPageSize: 100,
  },
} as const;

export default config;
