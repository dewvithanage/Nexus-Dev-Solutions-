"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Input from "../ui/Input";
import Button from "../ui/Button";

// Entrepreneur login form
export default function EntrepreneurLoginForm() {
  const router = useRouter();

  // Store email and password entered by the user
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Store error message
  const [error, setError] = useState("");

  // Used to show loading text while login is processing
  const [loading, setLoading] = useState(false);

  // Update input values when the user types
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  // Run when the Login button is clicked
  async function handleSubmit(event) {
    event.preventDefault();

    // Remove old error message
    setError("");

    // Simple validation
    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      // Send email and password to our login API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      // Show error if login failed
      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      // Store basic entrepreneur details temporarily
      // We will improve authentication/session handling later
      localStorage.setItem(
        "entrepreneur",
        JSON.stringify(data.entrepreneur)
      );

      // Go to dashboard after successful login
      router.push("/entrepreneur/dashboard");
    } catch (error) {
      console.error("Login request error:", error);

      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Email input */}
      <Input
        label="University Email"
        name="email"
        type="email"
        value={formData.email}
        placeholder="Enter your university email"
        onChange={handleChange}
      />

      {/* Password input */}
      <Input
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        placeholder="Enter your password"
        onChange={handleChange}
      />

      {/* Remember me and forgot password */}
      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-slate-600">
          <input type="checkbox" />
          Remember me
        </label>

        <button
          type="button"
          className="font-medium text-blue-600 hover:underline"
        >
          Forgot Password?
        </button>
      </div>

      {/* Display login error */}
      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}

      {/* Login button */}
      <Button type="submit">
        {loading ? "Logging in..." : "Login"}
      </Button>

    </form>
  );
}