"use client";

import React from "react";
import {
  LayoutDashboard,
  Tractor,
  Layers,
  Wheat,
  Users,
  CalendarCheck,
  CreditCard,
  FlaskConical,
  Droplets,
  DollarSign,
  Package,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  currentPhase?: string;
}

export function Sidebar({ currentPhase = "Phase 1" }: SidebarProps) {
  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, phase: "Phase 17", active: false },
    { name: "Farms & Land", icon: Tractor, phase: "Phase 5", active: false },
    { name: "Fields & Plots", icon: Layers, phase: "Phase 5", active: false },
    { name: "Crop Management", icon: Wheat, phase: "Phase 6", active: false },
    { name: "Labour Team", icon: Users, phase: "Phase 7", active: false },
    { name: "Daily Attendance", icon: CalendarCheck, phase: "Phase 8", active: false },
    { name: "Salaries & Wages", icon: CreditCard, phase: "Phase 9", active: false },
    { name: "Fertilizers & Nutrients", icon: FlaskConical, phase: "Phase 10", active: false },
    { name: "Irrigation Logs", icon: Droplets, phase: "Phase 11", active: false },
    { name: "Farm Expenses", icon: DollarSign, phase: "Phase 12", active: false },
    { name: "Harvest Logs", icon: Package, phase: "Phase 14", active: false },
    { name: "Crop Sales & Profit", icon: TrendingUp, phase: "Phase 15", active: false },
    { name: "Agricultural Calendar", icon: Calendar, phase: "Phase 16", active: false },
    { name: "Reports & Analytics", icon: BarChart3, phase: "Phase 18", active: false },
  ];

  return (
    <aside className="w-64 border-r border-earth-200 bg-white min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex">
      <div>
        <div className="mb-4 px-3 py-2 bg-farm-50 border border-farm-200 rounded-lg">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-farm-800">
            Active Milestone
          </div>
          <div className="text-sm font-bold text-farm-950 flex items-center gap-1.5 mt-0.5">
            <ShieldCheck className="h-4 w-4 text-farm-600" />
            {currentPhase} Setup
          </div>
          <div className="text-[11px] text-farm-700 mt-1">
            Architecture Foundation
          </div>
        </div>

        <div className="text-[11px] font-semibold uppercase tracking-wider text-earth-400 px-3 mb-2">
          System Modules
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-earth-600 hover:bg-earth-50 hover:text-earth-900 transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className="h-4 w-4 text-earth-400 group-hover:text-farm-600 transition-colors" />
                  <span>{item.name}</span>
                </div>
                <span className="text-[10px] bg-earth-100 text-earth-500 px-1.5 py-0.5 rounded font-mono group-hover:bg-farm-100 group-hover:text-farm-800 transition-colors">
                  {item.phase}
                </span>
              </div>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-earth-100 pt-3">
        <div className="flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium text-earth-600 hover:bg-earth-50 cursor-pointer">
          <Settings className="h-4 w-4 text-earth-400" />
          <span>System Settings</span>
        </div>
        <div className="text-[10px] text-earth-400 px-3 pt-2">
          Architecture v1.0.0 &bull; 2026
        </div>
      </div>
    </aside>
  );
}
