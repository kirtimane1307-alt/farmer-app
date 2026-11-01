"use client";

import React from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from "@/components/ui";
import { Settings, Shield, Bell, Sliders } from "lucide-react";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="System Settings"
        description="Application preferences, farm default measurement units, currency configuration, and profile parameters."
        phaseBadge="Phase 21"
        breadcrumbs={[{ label: "Settings" }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Sliders className="h-5 w-5 text-farm-600" />
              <CardTitle>Agricultural Preferences</CardTitle>
            </div>
            <CardDescription>Default units and localized formatting for farm metrics.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-earth-700">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-earth-50 border border-earth-100">
              <span className="font-medium">Area Measurement Unit</span>
              <span className="font-mono font-semibold text-earth-900">Acres (Default)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-earth-50 border border-earth-100">
              <span className="font-medium">System Currency</span>
              <span className="font-mono font-semibold text-earth-900">USD ($) / INR (₹)</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-earth-50 border border-earth-100">
              <span className="font-medium">Weight Measurement Unit</span>
              <span className="font-mono font-semibold text-earth-900">Quintals / Kilograms</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-farm-600" />
              <CardTitle>System Architecture Status</CardTitle>
            </div>
            <CardDescription>Active stack and deployment environment details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-earth-700">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-earth-50 border border-earth-100">
              <span className="font-medium">Current Milestone</span>
              <Badge variant="success">Phase 3 UI Foundation</Badge>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-earth-50 border border-earth-100">
              <span className="font-medium">Backend Architecture</span>
              <span className="font-mono text-earth-900">FastAPI + PostgreSQL</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-earth-50 border border-earth-100">
              <span className="font-medium">Client Framework</span>
              <span className="font-mono text-earth-900">Next.js 14 App Router</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
