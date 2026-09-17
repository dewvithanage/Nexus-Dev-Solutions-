"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import Input from "../ui/Input";
import Button from "../ui/Button";

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

      <div>
        <Input
          label="University Email"
          name="email"
          type="email"
          value={formData.email}
          placeholder="e.g. ar118533@fhss.sjp.ac.lk"
          onChange={handleChange}
        />
        {/* Client requirement: only FHSS students can register right now
            — see lib/validation.ts for the exact rule this hint describes. */}
        <p className="mt-1 text-[11px] text-slate-400">
          Only FHSS student emails are accepted right now (format: ar123456@fhss.sjp.ac.lk)
        </p>
      </div>

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

      <Input
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        placeholder="Create a password"
        onChange={handleChange}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit">{loading ? "Registering..." : "Register"}</Button>
    </form>
  );
}
