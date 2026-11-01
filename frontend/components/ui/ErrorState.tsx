import * as React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We encountered an unexpected issue while loading this view. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center flex flex-col items-center justify-center space-y-3",
        className
      )}
    >
      <div className="h-12 w-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shadow-2xs">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h4 className="text-base font-semibold text-red-950">{title}</h4>
      <p className="text-xs text-red-700 max-w-md">{message}</p>
      {onRetry && (
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onRetry} className="border-red-300 text-red-800 hover:bg-red-100/60">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
