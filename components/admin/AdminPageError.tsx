"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCw } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type AdminPageErrorProps = {
  title: string;
  error: Error & { digest?: string };
  reset: () => void;
};

// Shown by each admin page's error.tsx when loading its data fails (e.g.
// the database is unreachable). The sidebar stays usable, the message is
// plain, and "Try again" re-runs the server render. The real error is
// only logged; the digest is a reference that matches the server log.
export default function AdminPageError({ title, error, reset }: AdminPageErrorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    console.error(error);
  }, [error]);

  function retry() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title={title} notificationsHref="/admin/notifications" />

        <main className="p-8">
          <div role="alert" className="mx-auto max-w-lg rounded-xl border border-red-200 bg-white p-8 text-center">
            <AlertTriangle size={28} className="mx-auto text-red-500" />
            <h2 className="mt-3 text-base font-bold text-slate-900">We couldn&apos;t load this page</h2>
            <p className="mt-1 text-sm text-slate-500">
              Something went wrong while getting the latest data. Please try again in a moment.
            </p>
            <button
              onClick={retry}
              disabled={isPending}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <RotateCw size={14} className={isPending ? "animate-spin" : ""} />
              {isPending ? "Retrying..." : "Try again"}
            </button>
            {error.digest && <p className="mt-4 text-[10px] text-slate-400">Reference: {error.digest}</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
