import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

// Loading and error states shared by the entrepreneur pages, so every page
// shows the same feedback in the existing portal style.

// Grey placeholder bars for one section while its data loads.
export function SectionSkeleton({ title, rows = 4 }: { title?: string; rows?: number }) {
  return (
    <section aria-busy="true" aria-label={title ? `Loading ${title}` : "Loading"}>
      {title && <h2 className="mb-4 text-[16px] font-bold text-[#101828]">{title}</h2>}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${90 - (i % 3) * 15}%` }} />
        ))}
      </div>
    </section>
  );
}

// The whole portal page shell (sidebar, header, placeholder content), shown
// by loading.tsx while a page's data is fetched on the server.
export function PageSkeleton({ title = "Loading..." }: { title?: string }) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:flex-row bg-[#F5F7FA]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title={title} />
        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6">
          <p className="sr-only" role="status">
            Loading...
          </p>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-[110px] animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
          <SectionSkeleton rows={6} />
        </main>
      </div>
    </div>
  );
}

// What an error.tsx boundary shows: a plain message (never the technical
// error), a way to try again, and a way back to the dashboard.
export function ErrorPanel({
  title = "Something went wrong",
  message = "We couldn't load this page. Please try again in a moment.",
  onRetry,
  digest,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  digest?: string;
}) {
  return (
    <div role="alert" className="mx-auto mt-16 max-w-md rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertTriangle size={20} />
      </div>
      <h1 className="mt-4 text-lg font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      {/* The digest is a reference the server logs carry, not the error itself. */}
      {digest && <p className="mt-2 text-[11px] text-slate-400">Reference: {digest}</p>}
      <div className="mt-6 flex justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <RotateCcw size={14} /> Try again
          </button>
        )}
        <Link
          href="/entrepreneur/dashboard"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
