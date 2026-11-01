"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sprout, Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { LoadingSpinner } from "@/components/ui/LoadingState";
import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/dashboard";

  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ email?: string; password?: string }>({});

  // Direct access mode: redirect to dashboard
  useEffect(() => {
    router.replace(redirectPath || "/dashboard");
  }, [router, redirectPath]);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address (e.g. user@agricore.com)";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validate()) return;

    setIsSubmitting(true);
    const result = await login({
      email: email.trim().toLowerCase(),
      password,
    });
    setIsSubmitting(false);

    if (result.success) {
      router.replace(redirectPath);
    } else {
      setErrorMsg(result.error || "Invalid email or password. Please verify your credentials.");
    }
  };

  return (
    <div className="bg-white py-8 px-5 sm:px-10 shadow-md border border-earth-200 rounded-3xl space-y-6">
      {/* Server Error Alert */}
      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in"
        >
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <div className="font-semibold text-red-900">Authentication Failed</div>
            <div>{errorMsg}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* Email Field */}
        <Input
          label="Email Address"
          type="email"
          id="login-email"
          autoComplete="email"
          placeholder="name@agricore.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (validationErrors.email) setValidationErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={validationErrors.email}
          leftIcon={<Mail className="h-4 w-4 text-earth-400" />}
          disabled={isSubmitting}
          required
        />

        {/* Password Field */}
        <div className="space-y-1.5">
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            id="login-password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (validationErrors.password) setValidationErrors((prev) => ({ ...prev, password: undefined }));
            }}
            error={validationErrors.password}
            leftIcon={<Lock className="h-4 w-4 text-earth-400" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-earth-400 hover:text-earth-600 p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-farm-500"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-earth-500" />
                ) : (
                  <Eye className="h-4 w-4 text-earth-500" />
                )}
              </button>
            }
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          className="w-full py-2.5 text-sm font-semibold shadow-sm"
        >
          {isSubmitting ? "Logging in..." : "Sign in to Control Center"}
          {!isSubmitting && <ArrowRight className="h-4 w-4 ml-2" />}
        </Button>
      </form>

      {/* Quick Demo Credentials Guide */}
      <div className="p-3 rounded-xl bg-earth-50/80 border border-earth-100 text-[11px] text-earth-600 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-earth-800">
          <ShieldCheck className="h-3.5 w-3.5 text-farm-600" />
          Phase 4 Secure Authentication
        </div>
        <p className="text-earth-500">
          Register a new owner profile below, or sign in with your registered credentials. Passwords are securely hashed with salted bcrypt.
        </p>
      </div>

      {/* Link to Register */}
      <div className="text-center pt-2 border-t border-earth-100">
        <p className="text-xs text-earth-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-farm-700 hover:text-farm-800 hover:underline transition-colors"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-earth-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Background radial accent */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-farm-100 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-earth-200 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Logo & Title */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="h-11 w-11 rounded-2xl bg-farm-600 flex items-center justify-center text-white shadow-md group-hover:bg-farm-700 transition-colors">
              <Sprout className="h-6 w-6" />
            </div>
            <div className="text-left">
              <span className="font-bold text-earth-900 text-xl tracking-tight leading-none block">
                AgriCore
              </span>
              <span className="text-[11px] text-earth-500 font-medium">
                Farm Management OS
              </span>
            </div>
          </Link>

          <h2 className="text-2xl font-bold tracking-tight text-earth-900 pt-2">
            Sign in to your account
          </h2>
          <p className="text-xs sm:text-sm text-earth-500 max-w-xs mx-auto">
            Access real-time crop telemetry, labour rolls, and agricultural finance.
          </p>
        </div>

        {/* Card Form Wrapped in Suspense */}
        <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
          <Suspense fallback={<div className="bg-white py-12 rounded-3xl shadow-md border border-earth-200 text-center"><LoadingSpinner message="Loading login form..." /></div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
