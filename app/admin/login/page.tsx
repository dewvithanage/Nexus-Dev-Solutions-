import Image from "next/image";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

// This is the entry point to the whole Admin Portal (pages 27-42).
// Unlike the public site and entrepreneur portal, there's no "Admin
// Register" page — admin accounts are created directly in the database
// (see the "ADMIN ACCOUNT" section in prisma/seed.ts), since letting
// anyone sign up as an admin would be a security hole.
export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101b31] px-4 py-10">
      <section className="w-full max-w-[390px] rounded-xl bg-white px-8 py-8 shadow-lg">
        <div className="mb-4 flex justify-center">
          <Image
            src="/images/startup-spark-logo.png"
            alt="StartupSpark Logo"
            width={70}
            height={70}
            priority
            className="object-contain"
          />
        </div>

        <div className="mb-7 text-center">
          <h1 className="text-xl font-bold text-slate-900">StartupSpark</h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-blue-600">
            Admin Portal
          </p>
        </div>

        <AdminLoginForm />

        <p className="mt-5 text-center text-[11px] text-slate-400">
          Unauthorized access is strictly monitored and logged.
        </p>
      </section>
    </main>
  );
}
