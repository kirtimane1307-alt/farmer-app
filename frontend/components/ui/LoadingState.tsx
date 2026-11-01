import * as React from "react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({
  message = "Loading data...",
  className,
}: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center", className)}>
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-farm-200" />
        <div className="absolute inset-0 rounded-full border-2 border-farm-600 border-t-transparent animate-spin" />
      </div>
      <p className="mt-4 text-xs font-medium text-earth-500 animate-pulse">{message}</p>
    </div>
  );
}

export const LoadingState = LoadingSpinner;

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-earth-200 bg-white p-5 animate-pulse space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-earth-200 rounded" />
        <div className="h-8 w-8 bg-earth-100 rounded-lg" />
      </div>
      <div className="h-7 w-20 bg-earth-200 rounded" />
      <div className="h-3 w-32 bg-earth-100 rounded" />
    </div>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-earth-200 bg-white p-6 animate-pulse space-y-4">
      <div className="h-5 w-40 bg-earth-200 rounded" />
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3.5 bg-earth-100 rounded"
            style={{ width: `${85 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-earth-200 bg-white p-4 animate-pulse space-y-3">
      <div className="flex gap-4 pb-3 border-b border-earth-100">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-earth-200 rounded flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 py-2 border-b border-earth-50">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-3.5 bg-earth-100 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
