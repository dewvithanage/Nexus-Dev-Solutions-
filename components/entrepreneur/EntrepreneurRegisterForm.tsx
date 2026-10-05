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

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setFormData((previousData) => ({ ...previousData, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formData.fullName || !formData.email || !formData.password) {
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
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      router.push("/entrepreneur/login");
    } catch (error) {
      console.error("Registration request error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full Name"
        name="fullName"
        value={formData.fullName}
        placeholder="Enter your full name"
        onChange={handleChange}
      />

      <Input
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        placeholder="e.g. yourname@gmail.com"
        onChange={handleChange}
      />

      <Input
        label="Contact Number"
        name="phone"
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
          type="password"
          value={formData.password}
          placeholder="Create a password"
          onChange={handleChange}
        />
        <p className="mt-1 text-[11px] text-slate-400">{PASSWORD_RULES_HINT}</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit">{loading ? "Registering..." : "Register"}</Button>
    </form>
  );
}
