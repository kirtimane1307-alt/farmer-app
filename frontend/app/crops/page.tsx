"use client";

import React from "react";
import { DashboardLayout, PageHeader } from "@/components/layout";
import { EmptyState, Button } from "@/components/ui";
import { Wheat, Plus } from "lucide-react";

export default function CropsPage() {
  return (
    <DashboardLayout>
      <PageHeader
        title="Crop Cultivation"
        description="Monitor sowing dates, seed varieties, physiological growth stages, and expected harvest timelines."
        phaseBadge="Phase 6"
        breadcrumbs={[{ label: "Crops" }]}
        actions={
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Record Crop Sowing
          </Button>
        }
      />

      <EmptyState
        icon={Wheat}
        title="No Active Crops Recorded"
        description="Crop cycles recorded in Phase 6 connect directly to field plots, fertilizer/pesticide input tracking, and harvest yield records."
        phaseBadge="Phase 6"
        actionLabel="Record Crop Sowing"
      />
    </DashboardLayout>
  );
}
