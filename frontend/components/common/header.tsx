"use client";

import React from "react";
import { Sprout, Bell, User, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface HeaderProps {
  systemStatus?: "connected" | "connecting" | "offline";
}

export function Header({ systemStatus = "connected" }: HeaderProps) {
  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="h-16 border-b border-earth-200 bg-white/95 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center space-x-3">
        <div className="h-9 w-9 rounded-lg bg-farm-600 flex items-center justify-center text-white shadow-sm">
          <Sprout className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-earth-900 text-lg leading-tight">AgriCore</span>
            <span className="text-xs text-farm-700 bg-farm-100 font-semibold px-2 py-0.5 rounded">
              Phase 1
            </span>
          </div>
          <span className="text-xs text-earth-500 block">Enterprise Farm Management</span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden md:flex items-center text-xs text-earth-600 bg-earth-50 px-3 py-1.5 rounded-md border border-earth-200">
          <span className="text-earth-400 mr-2">Today:</span>
          <span className="font-medium text-earth-800">{currentDate}</span>
        </div>

        <Badge variant={systemStatus === "connected" ? "success" : "warning"} className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {systemStatus === "connected" ? "API Live" : "Checking API"}
        </Badge>

        <button className="h-9 w-9 rounded-full hover:bg-earth-100 flex items-center justify-center text-earth-600 transition-colors relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-farm-600" />
        </button>

        <div className="flex items-center space-x-2 border-l border-earth-200 pl-3">
          <div className="h-8 w-8 rounded-full bg-farm-100 border border-farm-300 flex items-center justify-center text-farm-800 font-semibold text-xs">
            FM
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-earth-900 leading-tight">Lead Farmer</div>
            <div className="text-[10px] text-earth-500">Farm Administrator</div>
          </div>
        </div>
      </div>
    </header>
  );
}
