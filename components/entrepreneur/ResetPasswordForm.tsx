"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { validatePassword, PASSWORD_RULES_HINT, PASSWORD_MIN_LENGTH } from "@/lib/validation";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expiredLink, setExpiredLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const invalidLink = expiredLink || !/^[a-f0-9]{64}$/.test(token);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || success) return;
    setError("");

    if (!/^[a-f0-9]{64}$/.test(token)) {
      setError("This reset link is invalid. Please request a new one.");
      return;
    }

    // Same rules the server enforces (and registration uses); checked here
    // first only so the person gets an instant message.
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json().catch(() => null);
      if (!data) {
        setError("Unable to reset password. Please try again.");
        return;
      }

      if (!response.ok) {
        if (data.code === "INVALID_RESET_LINK") setExpiredLink(true);
        setError(data.message || "Unable to reset password.");
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
      setTimeout(() => { router.replace("/entrepreneur/login"); router.refresh(); }, 2000);
    } catch (error) {
      console.error("Reset password request error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (<>
{success ? (
          <div role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Password reset successfully! Redirecting you to login...
          </div>
        ) : invalidLink ? (
          <div className="space-y-4">
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              This reset link is missing, invalid, or expired. Request a new link using your registered email.
            </p>
            <Link href="/entrepreneur/forgot-password" className="block rounded-md bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white">
              Request a new reset link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-xs font-medium text-slate-700">New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                id="new-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                disabled={loading}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
              />
              <p className="mt-1 text-[11px] text-slate-400">{PASSWORD_RULES_HINT}</p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-xs font-medium text-slate-700">Confirm Password</label>
              <input
                type={showPassword ? "text" : "password"}
                id="confirm-password"
                required
                minLength={PASSWORD_MIN_LENGTH}
                disabled={loading}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
              Show passwords
            </label>

            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
  </>);
}
