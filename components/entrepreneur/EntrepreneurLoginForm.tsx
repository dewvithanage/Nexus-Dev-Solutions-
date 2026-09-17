"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
 Himasha
=======
import Link from "next/link";
 Dev

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
    setFormData((previousData) => ({ ...previousData, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      // The server already set an httpOnly session cookie in the
      // response — there's nothing for us to store here. The browser
      // will send that cookie automatically on the next request.
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
      <Input
        label="University Email"
        name="email"
        type="email"
        value={formData.email}
        placeholder="Enter your university email"
        onChange={handleChange}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        value={formData.password}
        placeholder="Enter your password"
        onChange={handleChange}
      />

      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 text-slate-600">
          <input type="checkbox" />
          Remember me
        </label>

 Himasha
        <button type="button" className="font-medium text-blue-600 hover:underline">
          Forgot Password?
        </button>
=======
        <Link href="/entrepreneur/forgot-password" className="font-medium text-blue-600 hover:underline">
          Forgot Password?
        </Link>
 Dev
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit">{loading ? "Logging in..." : "Login"}</Button>
    </form>
  );
}
