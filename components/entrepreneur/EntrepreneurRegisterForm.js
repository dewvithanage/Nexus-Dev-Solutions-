"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Input from "../ui/Input";
import Button from "../ui/Button";

// Registration form for entrepreneurs
export default function EntrepreneurRegisterForm() {
  const router = useRouter();

  // Stores form values
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    businessName: "",
    password: "",
  });

  // Stores error messages
  const [error, setError] = useState("");

  // Stores loading state
  const [loading, setLoading] = useState(false);

  // Updates form data when user types
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  // Handles registration form submission
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    // Simple frontend validation
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.password
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);

      // Send registration details to the API
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      // Go to login page after successful registration
      router.push("/entrepreneur/login");
    } catch (error) {
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
        label="University Email"
        name="email"
        type="email"
        value={formData.email}
        placeholder="Enter university email"
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

      <Input
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        placeholder="Create a password"
        onChange={handleChange}
      />

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}

      {/* Register button */}
      <Button type="submit">
        {loading ? "Registering..." : "Register"}
      </Button>

    </form>
  );
}