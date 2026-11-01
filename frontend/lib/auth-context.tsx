"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, LoginPayload, RegisterPayload } from "@/types";
import { authApi, authStorage } from "@/lib/api/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load and verify existing session on initial application mount
  const refreshUser = useCallback(async () => {
    const existingToken = authStorage.getToken();
    if (existingToken) {
      setToken(existingToken);
    }

    try {
      const response = await authApi.getCurrentUser();
      if (response.data) {
        setUser(response.data);
      } else {
        if (existingToken) authStorage.removeToken();
        setUser(null);
        setToken(null);
      }
    } catch {
      if (existingToken) authStorage.removeToken();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (payload: LoginPayload): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await authApi.login(payload);
      if (response.data) {
        setUser(response.data.user);
        setToken(response.data.access_token);
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: response.error || "Failed to log in" };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "An unexpected login error occurred";
      return { success: false, error: msg };
    }
  };

  const register = async (payload: RegisterPayload): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const response = await authApi.register(payload);
      if (response.data) {
        setUser(response.data.user);
        setToken(response.data.access_token);
        setIsLoading(false);
        return { success: true };
      }
      setIsLoading(false);
      return { success: false, error: response.error || "Failed to register" };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "An unexpected registration error occurred";
      return { success: false, error: msg };
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setToken(null);
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
