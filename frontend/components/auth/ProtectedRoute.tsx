"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { Sprout } from "lucide-react";

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-earth-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-4 max-w-sm text-center">
          <div className="h-12 w-12 rounded-2xl bg-farm-600 flex items-center justify-center text-white shadow-md animate-pulse">
            <Sprout className="h-6 w-6" />
          </div>
          <LoadingSpinner message="Loading Farm Management System..." />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
