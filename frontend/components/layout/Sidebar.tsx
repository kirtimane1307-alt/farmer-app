"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout, ChevronLeft, ChevronRight, X, ShieldCheck } from "lucide-react";
import { NAVIGATION_CONFIG } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto">
      <div>
        {/* Brand / Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-earth-100">
          <Link
            href="/dashboard"
            onClick={onCloseMobile}
            className="flex items-center space-x-3 group"
          >
            <div className="h-9 w-9 rounded-xl bg-farm-600 flex items-center justify-center text-white shadow-sm group-hover:bg-farm-700 transition-colors">
              <Sprout className="h-5 w-5" />
            </div>
            {!isCollapsed && (
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-earth-900 text-base leading-tight">
                    AgriCore
                  </span>
                  <span className="text-[10px] bg-farm-100 text-farm-800 font-semibold px-1.5 py-0.2 rounded font-mono">
                    v1.0
                  </span>
                </div>
                <span className="text-[11px] text-earth-500 block">
                  Farm Management OS
                </span>
              </div>
            )}
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-earth-500 hover:bg-earth-100"
            aria-label="Close mobile menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Milestone Badge (When Expanded) */}
        {!isCollapsed && (
          <div className="mx-4 my-3 p-3 bg-gradient-to-br from-farm-50 to-earth-50 border border-farm-200/80 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-farm-800">
                Milestone Status
              </span>
              <span className="h-2 w-2 rounded-full bg-farm-500 animate-pulse" />
            </div>
            <div className="text-xs font-semibold text-earth-900 flex items-center gap-1.5 mt-0.5">
              <ShieldCheck className="h-3.5 w-3.5 text-farm-600" />
              Phase 3 UI Foundation
            </div>
          </div>
        )}

        {/* Navigation Groups */}
        <nav className="p-3 space-y-5" aria-label="Main Navigation">
          {NAVIGATION_CONFIG.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-earth-400">
                  {group.groupTitle}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === "/dashboard" || pathname === "/"
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onCloseMobile}
                      title={isCollapsed ? item.title : undefined}
                      className={cn(
                        "flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all group",
                        isActive
                          ? "bg-farm-600 text-white shadow-xs"
                          : "text-earth-600 hover:bg-earth-100/80 hover:text-earth-900"
                      )}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors",
                            isActive
                              ? "text-white"
                              : "text-earth-400 group-hover:text-farm-600"
                          )}
                        />
                        {!isCollapsed && (
                          <span className="truncate">{item.title}</span>
                        )}
                      </div>

                      {!isCollapsed && (
                        <div className="flex items-center gap-1">
                          {item.badge ? (
                            <span
                              className={cn(
                                "text-[10px] px-1.5 py-0.2 rounded font-semibold",
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-farm-100 text-farm-800"
                              )}
                            >
                              {item.badge}
                            </span>
                          ) : item.phase ? (
                            <span
                              className={cn(
                                "text-[9px] font-mono px-1 py-0.2 rounded",
                                isActive
                                  ? "bg-white/15 text-white/90"
                                  : "bg-earth-100 text-earth-400 group-hover:text-earth-600"
                              )}
                            >
                              {item.phase}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Footer & Collapse Toggle */}
      <div className="p-3 border-t border-earth-100 space-y-2">
        {/* Desktop Collapse Toggle Button */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="hidden md:flex w-full items-center justify-center p-2 rounded-lg text-earth-500 hover:bg-earth-100 text-xs font-medium transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <div className="flex items-center justify-between w-full px-2">
              <span className="text-[11px] text-earth-500">Collapse sidebar</span>
              <ChevronLeft className="h-4 w-4" />
            </div>
          )}
        </button>

        {!isCollapsed && (
          <div className="px-3 py-1 text-[10px] text-earth-400 text-center font-mono">
            AgriCore Engine &bull; Next.js 14
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-earth-950/50 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Aside */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden border-r border-earth-200",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Sticky Aside */}
      <aside
        className={cn(
          "hidden md:block shrink-0 bg-white border-r border-earth-200 transition-all duration-300 sticky top-0 h-screen z-30",
          isCollapsed ? "w-18" : "w-65"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
