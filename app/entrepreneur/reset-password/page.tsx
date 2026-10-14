import { Suspense } from "react";
import AuthCard from "@/components/entrepreneur/AuthCard";
import ResetPasswordForm from "@/components/entrepreneur/ResetPasswordForm";
export const metadata = { title: "Reset Password | StartupSpark", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default function ResetPasswordPage() {
  return <AuthCard title="Reset Password" subtitle="StartupSpark University Marketplace"><Suspense fallback={<p role="status">Loading password reset...</p>}><ResetPasswordForm /></Suspense></AuthCard>;
}
