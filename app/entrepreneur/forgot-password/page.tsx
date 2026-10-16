import AuthCard from "@/components/entrepreneur/AuthCard";
import ForgotPasswordForm from "@/components/entrepreneur/ForgotPasswordForm";
export const metadata = { title: "Forgot Password | StartupSpark" };
export default function ForgotPasswordPage() {
  return <AuthCard title="Forgot Password?" subtitle="Use the same email address you used to register"><ForgotPasswordForm /></AuthCard>;
}
