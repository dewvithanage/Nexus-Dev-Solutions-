import Link from "next/link";
import { SearchX } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

// Shown for an order id that doesn't exist (or isn't a valid id).
export default function SaleNotFound() {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title="Transaction Audit" notificationsHref="/admin/notifications" />

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-8 text-center">
            <SearchX size={28} className="mx-auto text-slate-400" />
            <h2 className="mt-3 text-base font-bold text-slate-900">Order not found</h2>
            <p className="mt-1 text-sm text-slate-500">
              This order doesn&apos;t exist. The link may be wrong or out of date.
            </p>
            <Link
              href="/admin/sales"
              className="mt-5 inline-block rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Back to Sales Verification
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
