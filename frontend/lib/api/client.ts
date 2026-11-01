/**
 * Standardized HTTP API Client for FastAPI Backend Communication.
 * Architecture preparation for subsequent phases.
 */

import { config } from "@/lib/config";

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = config.api.baseUrl) {
    this.baseUrl = baseUrl;
  }

  private getAuthToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("auth_token");
    }
    return null;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanBase = this.baseUrl.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${cleanBase}${cleanPath}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, headers, body, ...restOptions } = options;
    const url = this.buildUrl(path, params);

    const defaultHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Local-Demo": "true",
    };

    const token = this.getAuthToken();
    if (token) {
      defaultHeaders["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        headers: {
          ...defaultHeaders,
          ...(headers as Record<string, string>),
        },
        body: body ? JSON.stringify(body) : undefined,
        ...restOptions,
      });

      const contentType = response.headers.get("content-type");
      let responseBody: unknown = null;

      if (contentType && contentType.includes("application/json")) {
        responseBody = await response.json();
      } else {
        responseBody = await response.text();
      }

      if (!response.ok) {
        let errorMessage = response.statusText || "An unexpected server error occurred";

        if (responseBody && typeof responseBody === "object") {
          const bodyObj = responseBody as Record<string, unknown>;
          if (typeof bodyObj.detail === "string") {
            errorMessage = bodyObj.detail;
          } else if (bodyObj.error && typeof bodyObj.error === "object") {
            const errObj = bodyObj.error as Record<string, unknown>;
            if (typeof errObj.message === "string") {
              errorMessage = errObj.message;
            }
          }
        }

        return {
          data: null,
          error: errorMessage,
          status: response.status,
        };
      }

      // Check if backend wrapped in standard { success, data } envelope
      if (responseBody && typeof responseBody === "object" && "data" in responseBody) {
        const bodyWithData = responseBody as { data: T };
        return {
          data: bodyWithData.data,
          error: null,
          status: response.status,
        };
      }

      return {
        data: responseBody as T,
        error: null,
        status: response.status,
      };
    } catch (err: unknown) {
      let message = "Network error. Please check backend server connection.";
      if (err instanceof Error) {
        if (err.message === "Failed to fetch") {
          message = "Cannot connect to AgriCore API server. Please verify the backend is running on http://localhost:8000.";
        } else {
          message = err.message;
        }
      }
      return {
        data: null,
        error: message,
        status: 0,
      };
    }
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return this.request<T>(path, { method: "GET", params });
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body,
    });
  }

  put<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PUT",
      body,
    });
  }

  patch<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "PATCH",
      body,
    });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
