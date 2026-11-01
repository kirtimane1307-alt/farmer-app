"use client";

import React from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { EmptyState, Button } from "@/components/ui";
import { Droplets, Plus } from "lucide-react";

export default function IrrigationPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Irrigation Management"
        description="Record water source utilization, pump runtimes, drip/sprinkler cycles, and water volume logs."
        phaseBadge="Phase 11"
        breadcrumbs={[{ label: "Resources", href: "/fertilizer" }, { label: "Irrigation" }]}
        actions={
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Log Irrigation Run
          </Button>
        }
      />

      <EmptyState
        icon={Droplets}
        title="No Irrigation Sessions Recorded"
        description="Digital irrigation logs track water consumption per field plot, helping optimize electricity/fuel pump costs in Phase 11."
        phaseBadge="Phase 11"
        actionLabel="Log Irrigation Run"
      />
    </DashboardLayout>
  );
}
