"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import Input from "../ui/Input";
import Button from "../ui/Button";
import {
  isValidEmailFormat,
  validatePassword,
  PASSWORD_RULES_HINT,
} from "@/lib/validation";

type RegisterFormData = {
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  password: string;
};

export default function EntrepreneurRegisterForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: "",
    email: "",
    phone: "",
    businessName: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormData((previousData) => ({ ...previousData, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");

    if (!formData.fullName.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.businessName.trim() || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    // Same rules the server enforces, checked here first only so the
    // person gets an instant message. The server re-checks everything.
    if (!isValidEmailFormat(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, fullName: formData.fullName.trim(), email: formData.email.trim(), phone: formData.phone.trim(), businessName: formData.businessName.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      setSubmitted(true);
    } catch (error) {
      console.error("Registration request error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-bold text-emerald-700">Application submitted</p>
          <p className="mt-2 text-xs leading-5 text-emerald-700">
            An admin from the Startup Spark team will review your application. We&apos;ll email{" "}
            <span className="font-semibold">{formData.email}</span> once it&apos;s approved. Meanwhile, you can sign
            in to complete your business profile.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/entrepreneur/login")}
          className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Go to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full Name"
        name="fullName"
        autoComplete="name"
        value={formData.fullName}
        placeholder="Enter your full name"
        onChange={handleChange}
      />

      <Input
        label="Email"
        name="email"
        autoComplete="email"
        type="email"
        value={formData.email}
        placeholder="e.g. yourname@gmail.com"
        onChange={handleChange}
      />

      <Input
        label="Contact Number"
        name="phone"
        type="tel"
        autoComplete="tel"
        value={formData.phone}
        placeholder="Enter contact number"
        onChange={handleChange}
      />

      <Input
        label="Business Name"
        name="businessName"
        value={formData.businessName}
        placeholder="Enter business name"
        onChange={handleChange}
      />

      <div>
        <Input
          label="Password"
          name="password"
          autoComplete="new-password"
          type="password"
          value={formData.password}
          placeholder="Create a password"
          onChange={handleChange}
        />
        <p className="mt-1 text-[11px] text-slate-400">{PASSWORD_RULES_HINT}</p>
      </div>

      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={loading} className="disabled:opacity-60">{loading ? "Registering..." : "Register"}</Button>
    </form>
  );
}
