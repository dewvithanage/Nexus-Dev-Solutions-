"use client";

import { useState } from "react";
import Link from "next/link";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import { useQueryNavigation } from "@/components/admin/useQueryNavigation";
import { formatDateTime } from "@/lib/format-date";
import type { SaleDetails } from "@/lib/admin/sales";

// The interactive part of Sales Confirmation Details. The order arrives
// already loaded from the server; after Verify or Flag the page is
// re-rendered on the server, so it always shows the saved state.
export default function SaleDetailsView({ order }: { order: SaleDetails }) {
  const { isPending, refresh } = useQueryNavigation();
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const busy = submitting || isPending;

  async function runAction(url: string, init: RequestInit, fallback: string) {
    setActionError("");
    setSubmitting(true);
    try {
      const response = await fetch(url, init);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setActionError(data.message || fallback);
      }
      // Refresh either way: on a 409 the order was changed elsewhere, so
      // show its real current state.
      refresh();
    } catch {
      setActionError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleVerify() {
    runAction(`/api/admin/sales/${order.id}/verify`, { method: "PATCH" }, "Unable to verify this sale.");
  }

  function handleFlag() {
    const input = window.prompt("Describe the irregularity (optional):");
    // Cancel returns null: stop, instead of flagging anyway.
    if (input === null) return;
    runAction(
      `/api/admin/sales/${order.id}/flag`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: input.trim() || undefined }),
      },
      "Unable to flag this sale."
    );
  }

  const canAct = order.status === "PENDING_VERIFICATION";
  const seller = order.business.entrepreneurProfile;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title={`Transaction Audit: TX-${order.id.slice(-4)}`} notificationsHref="/admin/notifications" />

        <main className="p-4 sm:p-6 lg:p-8">
          {actionError && (
            <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">
              {actionError}
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 text-sm font-bold text-slate-900">Order Details</h2>
                <div className="space-y-2 text-sm">
                  {order.items.map((item, index) => (
                    <div key={`${item.product.id}-${index}`} className="flex justify-between">
                      <span className="text-slate-500">
                        {item.product.name} (x{item.quantity})
                      </span>
                      <span className="font-medium text-slate-800">
                        Rs.{(item.unitPriceAtOrder * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
                    <span className="font-bold text-slate-900">Total Paid</span>
                    <span className="font-bold text-blue-600">Rs.{order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900">Buyer Information</h3>
                  <p className="mt-2 text-sm font-medium text-slate-800">{order.buyerName}</p>
                  <p className="text-xs text-slate-500">{order.buyerPhone}</p>
                  <p className="mt-1 text-xs text-slate-500">{order.deliveryLocation}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900">Seller Information</h3>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {seller.user.name} ({order.business.businessName})
                  </p>
                  <p className="break-all text-xs text-slate-500">{seller.user.email}</p>
                  <p className="mt-1 text-xs text-blue-600">{seller.university}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-bold text-slate-900">Verification Audit Trail</h3>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li>• {formatDateTime(order.createdAt)} — Order Created</li>
                  {order.salesConfirmation && (
                    <li>
                      • {formatDateTime(order.salesConfirmation.deliveryDate)} — Fulfillment Proof Submitted by{" "}
                      {seller.user.name}
                    </li>
                  )}
                  {order.salesConfirmation?.verifiedAt && (
                    <li>
                      • {formatDateTime(order.salesConfirmation.verifiedAt)} —{" "}
                      {order.salesConfirmation.verificationStatus === "VERIFIED" ? "Verified" : "Flagged"} by{" "}
                      {order.salesConfirmation.verifiedBy?.name}
                    </li>
                  )}
                </ul>
                {order.salesConfirmation?.notes && (
                  <p className="mt-3 rounded-md bg-slate-50 p-3 text-xs italic text-slate-600">
                    &ldquo;{order.salesConfirmation.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <div className="h-fit rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-bold text-slate-900">Fulfillment Proof</h3>
              {order.salesConfirmation ? (
                <div className="overflow-hidden rounded-lg bg-slate-100">
                  <img src={order.salesConfirmation.proofImageUrl} alt="Delivery proof" className="w-full object-cover" />
                </div>
              ) : (
                <p className="text-xs text-slate-500">No proof submitted yet.</p>
              )}

              {canAct ? (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={handleFlag}
                    disabled={busy}
                    className="w-full rounded-md bg-red-500 py-2.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-60"
                  >
                    Flag Irregularity
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={busy}
                    className="w-full rounded-md bg-emerald-500 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {busy ? "Saving..." : "Confirm & Release"}
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-center text-xs font-semibold text-slate-500">
                  This order is already {order.status.toLowerCase().replace(/_/g, " ")}.
                </p>
              )}
            </div>
          </div>

          <Link href="/admin/sales" className="mt-6 inline-block text-xs font-semibold text-blue-600 hover:underline">
            ← Back to Sales Verification
          </Link>
        </main>
      </div>
    </div>
  );
}
