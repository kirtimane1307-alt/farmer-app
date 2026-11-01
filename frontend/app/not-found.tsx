import React from "react";
import Link from "next/link";
import { Sprout, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-earth-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4 p-8 bg-white rounded-3xl border border-earth-200 shadow-lg">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-farm-50 text-farm-600 border border-farm-200 flex items-center justify-center shadow-xs">
          <Sprout className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <span className="text-xs font-mono font-bold text-farm-700 bg-farm-100 px-2 py-0.5 rounded">
            Error 404
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-earth-900 mt-2">
            Field Plot Not Found
          </h2>
          <p className="text-xs sm:text-sm text-earth-500">
            The page or agricultural module you are looking for does not exist or has been moved to another quadrant.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="primary" size="md" className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Architecture Center
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
