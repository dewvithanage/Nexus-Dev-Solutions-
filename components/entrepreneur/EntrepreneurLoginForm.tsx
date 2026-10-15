"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Input from "../ui/Input";
import Button from "../ui/Button";

type LoginFormData = {
  email: string;
  password: string;
};

export default function EntrepreneurLoginForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, email: formData.email.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      // Accounts still waiting for admin approval go to their status page;
      // the seller pages only open once approved.
      router.push(
        data.entrepreneur?.status === "APPROVED" ? "/entrepreneur/dashboard" : "/entrepreneur/application-status"
      );
      router.refresh();
    } catch (error) {
      console.error("Login request error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        name="email"
        autoComplete="username"
        type="email"
        value={formData.email}
        placeholder="Enter your email"
        onChange={handleChange}
      />

      <Input
        label="Password"
        name="password"
        autoComplete="current-password"
        type="password"
        value={formData.password}
        placeholder="Enter your password"
        onChange={handleChange}
      />

      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600">Secure entrepreneur sign-in</span>

        <Link
          href="/entrepreneur/forgot-password"
          className="font-medium text-blue-600 hover:underline"
        >
          Forgot Password?
        </Link>
      </div>

      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={loading} className="disabled:opacity-60">
        {loading ? "Logging in..." : "Login"}
      </Button>
    </form>
  );
}
