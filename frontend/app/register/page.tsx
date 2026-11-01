"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sprout, Eye, EyeOff, Lock, Mail, User, Phone, ArrowRight, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Direct access mode: redirect to dashboard
  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  const validate = (): boolean => {
    const errors: {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!name.trim()) {
      errors.name = "Full name is required";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!email.trim()) {
      errors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address (e.g. name@agricore.com)";
    }

    if (phone.trim() && !/^[+0-9\s\-()]{7,20}$/.test(phone.trim())) {
      errors.phone = "Please enter a valid contact phone number";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm password is required";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validate()) return;

    setIsSubmitting(true);
    const result = await register({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      password,
    });
    setIsSubmitting(false);

    if (result.success) {
      router.replace("/dashboard");
    } else {
      setErrorMsg(result.error || "Failed to create account. Please check your details.");
    }
  };

  return (
    <div className="min-h-screen bg-earth-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
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
            Create an owner account
          </h2>
          <p className="text-xs sm:text-sm text-earth-500 max-w-xs mx-auto">
            Get started with digital operations for fields, crops, workforce, and farm ledgers.
          </p>
        </div>

        {/* Card Form */}
        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-5 sm:px-10 shadow-md border border-earth-200 rounded-3xl space-y-5">
            {/* Server Error Alert */}
            {errorMsg && (
              <div
                role="alert"
                className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in"
              >
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-semibold text-red-900">Registration Error</div>
                  <div>{errorMsg}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Full Name */}
              <Input
                label="Full Name"
                type="text"
                id="register-name"
                autoComplete="name"
                placeholder="e.g. John Anderson"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (validationErrors.name) setValidationErrors((prev) => ({ ...prev, name: undefined }));
                }}
                error={validationErrors.name}
                leftIcon={<User className="h-4 w-4 text-earth-400" />}
                disabled={isSubmitting}
                required
              />

              {/* Email Address */}
              <Input
                label="Email Address"
                type="email"
                id="register-email"
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

              {/* Phone Number (Optional) */}
              <Input
                label="Phone Number (Optional)"
                type="tel"
                id="register-phone"
                autoComplete="tel"
                placeholder="+1 (555) 019-2834"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (validationErrors.phone) setValidationErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                error={validationErrors.phone}
                leftIcon={<Phone className="h-4 w-4 text-earth-400" />}
                disabled={isSubmitting}
              />

              {/* Password */}
              <Input
                label="Password (min 8 characters)"
                type={showPassword ? "text" : "password"}
                id="register-password"
                autoComplete="new-password"
                placeholder="Create a strong password"
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

              {/* Confirm Password */}
              <Input
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                id="register-confirm-password"
                autoComplete="new-password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (validationErrors.confirmPassword) setValidationErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }}
                error={validationErrors.confirmPassword}
                leftIcon={<Lock className="h-4 w-4 text-earth-400" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-earth-400 hover:text-earth-600 p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-farm-500"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-earth-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-earth-500" />
                    )}
                  </button>
                }
                disabled={isSubmitting}
                required
              />

              {/* Submit Button */}
              <div className="pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  className="w-full py-2.5 text-sm font-semibold shadow-sm"
                >
                  {isSubmitting ? "Creating Account..." : "Complete Registration"}
                  {!isSubmitting && <ArrowRight className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </form>

            {/* Security Guarantee */}
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-farm-50/70 border border-farm-200 text-[11px] text-farm-800">
              <CheckCircle2 className="h-4 w-4 text-farm-600 shrink-0" />
              <span>Passwords are hashed with bcrypt rounds. Plaintext is never stored.</span>
            </div>

            {/* Link to Login */}
            <div className="text-center pt-2 border-t border-earth-100">
              <p className="text-xs text-earth-600">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-farm-700 hover:text-farm-800 hover:underline transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
