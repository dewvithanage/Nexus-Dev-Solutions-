"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sentViaEmail, setSentViaEmail] = useState(true);
  const [fallbackLink, setFallbackLink] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your university email.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong.");
        return;
      }

      setSubmitted(true);
      setSentViaEmail(data.sentViaEmail);
      setFallbackLink(data.resetLink);
    } catch (error) {
      console.error("Forgot password request error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101b31] px-4 py-10">
      <section className="w-full max-w-[390px] rounded-xl bg-white px-8 py-8 shadow-lg">
        <div className="mb-4 flex justify-center">
          <Image
            src="/images/startup-spark-logo.png"
            alt="StartupSpark Logo"
            width={70}
            height={70}
            priority
            className="object-contain"
          />
        </div>

        <div className="mb-7 text-center">
          <h1 className="text-xl font-bold text-slate-900">Forgot Password?</h1>
          <p className="mt-1 text-xs text-slate-500">Access your entrepreneur dashboard</p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            {sentViaEmail ? (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                If that email is registered, a password reset link has been sent to it.
                Check your inbox (and spam folder).
              </div>
            ) : (
              <>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                  Email sending isn't configured on this machine yet — here's the
                  reset link directly instead:
                </div>
                {fallbackLink && (
                  <Link
                    href={fallbackLink}
                    className="block break-all rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 hover:underline"
                  >
                    {fallbackLink}
                  </Link>
                )}
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-medium text-slate-700">
                University Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ar18511@fhss.sjp.ac.lk"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send Password Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-slate-500">
          New entrepreneur?{" "}
          <Link href="/entrepreneur/register" className="font-semibold text-blue-600 hover:underline">
            Register here
          </Link>
        </p>
      </section>
    </main>
  );
}
