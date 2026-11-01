import * as React from "react";
import { LucideIcon, Sparkles } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  phaseBadge?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonProps["variant"];
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  children?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  phaseBadge,
  actionLabel,
  onAction,
  actionVariant = "primary",
  secondaryActionLabel,
  onSecondaryAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-earth-200 bg-white shadow-2xs">
      <div className="h-14 w-14 rounded-2xl bg-farm-50 text-farm-600 border border-farm-200 flex items-center justify-center mb-4 shadow-xs">
        <Icon className="h-7 w-7" />
      </div>

      {phaseBadge && (
        <Badge variant="neutral" className="mb-2 text-[11px] font-mono">
          <Sparkles className="h-3 w-3 mr-1 text-farm-600" />
          Scheduled for {phaseBadge}
        </Badge>
      )}

      <h3 className="text-lg font-semibold text-earth-900 tracking-tight">
        {title}
      </h3>
      <p className="mt-1.5 text-xs sm:text-sm text-earth-500 max-w-md leading-relaxed">
        {description}
      </p>

      {children && <div className="mt-4 w-full max-w-sm">{children}</div>}

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && (
            <Button variant={actionVariant} size="sm" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button variant="outline" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
