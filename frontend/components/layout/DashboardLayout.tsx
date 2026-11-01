"use client";

import React, { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  systemStatus?: "connected" | "connecting" | "offline";
  currentPhase?: string;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  requireAuth?: boolean;
}

export function DashboardLayout({
  children,
  systemStatus,
  title,
  breadcrumbs,
  requireAuth = true,
}: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const content = (
    <div className="min-h-screen bg-earth-50 flex">
      {/* Accessible skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-farm-700 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Sidebar Navigation */}
      <Sidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onToggleMobile={() => setIsMobileOpen(!isMobileOpen)}
          systemStatus={systemStatus}
          title={title}
          breadcrumbs={breadcrumbs}
        />

        {/* Content Container */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6"
        >
          {children}
        </main>
      </div>
    </div>
  );

  if (requireAuth) {
    return <ProtectedRoute>{content}</ProtectedRoute>;
  }

  return content;
}
