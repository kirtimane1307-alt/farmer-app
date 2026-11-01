"use client";

import React from "react";
import { Header } from "@/components/common/header";
import { Sidebar } from "@/components/common/sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  systemStatus?: "connected" | "connecting" | "offline";
  currentPhase?: string;
}

/**
 * AppLayout provides the application shell containing Header, Sidebar, and Main content area.
 */
export function AppLayout({
  children,
  systemStatus = "connected",
  currentPhase = "Phase 1",
}: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-earth-50">
      <Header systemStatus={systemStatus} />

      <div className="flex-1 flex">
        <Sidebar currentPhase={currentPhase} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
