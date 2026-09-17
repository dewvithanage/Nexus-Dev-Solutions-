"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

type AdminLoginFormData = {
  email: string;
  password: string;
};

// This form reuses the SAME Input and Button components from
// components/ui/ that the entrepreneur login form uses — that's what
// keeps the whole site's forms looking consistent without copying styles
// around. Only the submit logic (which API route it calls, where it
// redirects) is different from EntrepreneurLoginForm.
export default function AdminLoginForm() {
  const router = useRouter();

  const [formData, setFormData] = useState<AdminLoginFormData>({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormData((previousData) => ({ ...previousData, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter your admin email and password.");
      return;
    }

    try {
      setLoading(true);

      // Calls the ADMIN-specific login route (not the entrepreneur one) —
      // it checks role === "ADMIN" instead of "ENTREPRENEUR".
      const response = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      // Server already set the httpOnly session cookie — just navigate.
      router.push("/admin");
    } catch (error) {
      console.error("Admin login request error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Administrator Email"
        name="email"
        type="email"
        value={formData.email}
        placeholder="devon.lane@startupspark.edu"
        onChange={handleChange}
      />

      <Input
        label="Secure Password"
        name="password"
        type="password"
        value={formData.password}
        placeholder="Enter your password"
        onChange={handleChange}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" className="bg-blue-700 hover:bg-blue-800">
        {loading ? "Signing in..." : "Sign In to Admin Console"}
      </Button>
    </form>
  );
}
