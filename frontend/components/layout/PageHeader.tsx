import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  phaseBadge?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  badge,
  phaseBadge,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-3">
      {/* Breadcrumb */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-earth-500">
          <Link href="/dashboard" className="hover:text-farm-700 flex items-center transition-colors">
            <Home className="h-3.5 w-3.5 mr-1" />
            Home
          </Link>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.label}>
              <ChevronRight className="h-3 w-3 text-earth-400" />
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-farm-700 transition-colors">
                  {crumb.label}
                </Link>
              ) : (
                <span className="font-medium text-earth-800">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Main Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-earth-900 leading-tight">
              {title}
            </h1>
            {badge && <Badge variant="neutral">{badge}</Badge>}
            {phaseBadge && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-farm-100 text-farm-800 border border-farm-200">
                {phaseBadge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-earth-500 mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
