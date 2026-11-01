/**
 * Authentication API Service Client
 * Provides centralized methods for login, registration, current user, and logout.
 */

import { apiClient, ApiResponse } from "@/lib/api/client";
import { User, TokenResponse, LoginPayload, RegisterPayload } from "@/types";

const TOKEN_KEY = "auth_token";

export const authStorage = {
  getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, token);
    // Also synchronize a readable cookie for Next.js client/SSR synchronization
    document.cookie = `access_token=${token}; path=/; max-age=86400; SameSite=Lax`;
  },

  removeToken(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
  },
};

export const authApi = {
  /**
   * Authenticate existing user with email and password.
   */
  async login(payload: LoginPayload): Promise<ApiResponse<TokenResponse>> {
    const response = await apiClient.post<TokenResponse>("/auth/login", payload);
    if (response.data?.access_token) {
      authStorage.setToken(response.data.access_token);
    }
    return response;
  },

  /**
   * Register a new user and obtain immediate session tokens.
   */
  async register(payload: RegisterPayload): Promise<ApiResponse<TokenResponse>> {
    const response = await apiClient.post<TokenResponse>("/auth/register", payload);
    if (response.data?.access_token) {
      authStorage.setToken(response.data.access_token);
    }
    return response;
  },

  /**
   * Retrieve current user profile using active token.
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>("/auth/me");
  },

  /**
   * Notify server of logout and clear local credentials.
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post("/auth/logout");
    } catch {
      // Ignore network errors on logout, proceed with local cleanup
    } finally {
      authStorage.removeToken();
    }
  },
};

export default authApi;
