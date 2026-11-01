"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Bell, Search, User as UserIcon, ChevronRight, Home, LogOut } from "lucide-react";
import { getNavigationItemByPath } from "@/lib/navigation";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth-context";
import { NotificationBellDropdown } from "@/components/notifications/NotificationBellDropdown";

export interface HeaderProps {
  onToggleMobile: () => void;
  systemStatus?: "connected" | "connecting" | "offline";
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function Header({
  onToggleMobile,
  systemStatus = "connected",
  title,
  breadcrumbs,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const activeNav = getNavigationItemByPath(pathname);

  const currentDate = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  const displayTitle = title || activeNav?.title || "Farm Management";

  const handleLogout = async () => {
    await logout();
    router.replace("/dashboard");
  };

  const getInitials = (name?: string) => {
    if (!name) return "FM";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-earth-200 bg-white/95 px-4 sm:px-6 backdrop-blur shadow-2xs">
      {/* Left: Mobile Toggle & Page Context */}
      <div className="flex items-center gap-3">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onToggleMobile}
          className="md:hidden p-2 rounded-xl text-earth-600 hover:bg-earth-100 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Current Module Title & Optional Breadcrumbs */}
        <div className="flex items-center gap-2">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center space-x-1.5 text-xs text-earth-500 mr-1.5">
              <Link href="/dashboard" className="hover:text-farm-700 flex items-center transition-colors">
                <Home className="h-3.5 w-3.5 mr-1 text-earth-400" />
                <span className="sr-only">Home</span>
              </Link>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight className="h-3 w-3 text-earth-300" />
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-farm-700 transition-colors truncate max-w-[120px]">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-earth-700 truncate max-w-[140px]">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
              <span className="text-earth-300 mx-1">/</span>
            </nav>
          )}

          <span className="font-semibold text-earth-900 text-sm sm:text-base tracking-tight">
            {displayTitle}
          </span>
          {activeNav?.phase && (
            <span className="hidden sm:inline-flex text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-earth-100 text-earth-600">
              {activeNav.phase}
            </span>
          )}
        </div>
      </div>

      {/* Right: Quick Search, System Telemetry, Notifications & User Area */}
      <div className="flex items-center gap-2.5 sm:gap-4">
        {/* Search bar placeholder (Desktop only) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-earth-200 bg-earth-50 text-earth-400 text-xs w-60">
          <Search className="h-3.5 w-3.5" />
          <span className="text-earth-400">Search farms, crops, labour...</span>
          <kbd className="ml-auto text-[10px] bg-white border border-earth-200 rounded px-1.5 font-mono text-earth-400">
            /
          </kbd>
        </div>

        {/* Date Display */}
        <div className="hidden sm:flex items-center text-xs text-earth-600 bg-earth-50 px-3 py-1.5 rounded-lg border border-earth-200">
          <span className="text-earth-400 mr-1.5">Today:</span>
          <span className="font-medium text-earth-800">{currentDate}</span>
        </div>

        {/* Phase Indicator Badge */}
        <Badge variant="success" className="text-[11px] py-0.5 hidden xs:inline-flex">
          Phase 4 Auth Active
        </Badge>

        {/* Interactive Notification Bell with Live Unread Dropdown (Phase 19) */}
        <NotificationBellDropdown />

        {/* User Profile & Logout Area */}
        <div className="flex items-center gap-2 pl-2 border-l border-earth-200">
          <div
            className="h-8 w-8 rounded-xl bg-farm-100 border border-farm-300 text-farm-800 flex items-center justify-center font-bold text-xs shadow-2xs"
            title={user?.name || "Farm Administrator"}
          >
            {getInitials(user?.name)}
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-semibold text-earth-900 leading-tight max-w-[140px] truncate">
              {user?.name || "Farm Administrator"}
            </div>
            <div className="text-[10px] text-earth-500 max-w-[140px] truncate">
              {user?.email || "admin@farm.local"}
            </div>
          </div>

          {/* Logout Action Button */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 p-1.5 rounded-lg text-earth-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
