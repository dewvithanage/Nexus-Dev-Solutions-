"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useQueryNavigation } from "@/components/admin/useQueryNavigation";

// The interactive part of Entrepreneur Details: the back button and the
// Approve / Reject buttons. The details themselves are rendered on the
// server (app/admin/entrepreneurs/[id]/page.tsx); after a decision the page
// is re-rendered from the database, so the status shown is the saved one.
export default function EntrepreneurDecisionBar({
  entrepreneurId,
  name,
  status,
}: {
  entrepreneurId: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}) {
  const router = useRouter();
  const { isPending, refresh } = useQueryNavigation();
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function decide(action: "approve" | "reject") {
    let body: string | undefined;
    if (action === "reject") {
      const input = window.prompt("Reason for rejecting this application (optional):");
      // Cancel returns null: stop, instead of rejecting without a reason.
      if (input === null) return;
      body = JSON.stringify({ rejectionReason: input.trim() || undefined });
    }

    setActionLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/entrepreneurs/${entrepreneurId}/${action}`, {
        method: "PATCH",
        ...(body && { headers: { "Content-Type": "application/json" }, body }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) setNotice(data.message || "");
      else setError(data.message || `Unable to ${action}.`);
      refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setActionLoading(false);
    }
  }

  const busy = actionLoading || isPending;

  return (
    <>
      <div className="flex min-h-[46px] flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-[#E2E8F0] bg-white px-4 py-2 sm:px-5">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-left text-[13px] font-semibold text-slate-700 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Reviewing Application — {name}
        </button>

        {status === "PENDING" && (
          <div className="flex w-full gap-2 sm:w-auto">
            <button
              onClick={() => decide("reject")}
              disabled={busy}
              className="flex-1 whitespace-nowrap rounded-md bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60 sm:flex-none"
            >
              Reject Business
            </button>
            <button
              onClick={() => decide("approve")}
              disabled={busy}
              className="flex-1 whitespace-nowrap rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 sm:flex-none"
            >
              Approve & Activate
            </button>
          </div>
        )}
      </div>

      {(error || notice) && (
        <div className="px-4 pt-4 sm:px-6 lg:px-8" aria-live="polite">
          {error ? (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          ) : (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>
          )}
        </div>
      )}
    </>
  );
}
