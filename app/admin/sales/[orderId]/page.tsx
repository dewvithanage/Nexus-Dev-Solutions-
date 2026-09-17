"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type OrderDetails = {
  id: string;
  buyerName: string;
  buyerPhone: string;
  deliveryLocation: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  business: {
    businessName: string;
    entrepreneurProfile: { university: string | null; user: { name: string; email: string } };
  };
  items: { quantity: number; unitPriceAtOrder: number; product: { name: string } }[];
  salesConfirmation: {
    proofImageUrl: string;
    deliveryDate: string;
    notes: string | null;
    verificationStatus: string;
    verifiedAt: string | null;
    verifiedBy: { name: string } | null;
  } | null;
};

export default function SalesConfirmationDetailsPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.orderId]);

  async function loadOrder() {
    try {
      const response = await fetch(`/api/admin/sales/${params.orderId}`);
      const data = await response.json();
      if (response.ok) setOrder(data.order);
    } catch (error) {
      console.error("Load order error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    setActionLoading(true);
    await fetch(`/api/admin/sales/${params.orderId}/verify`, { method: "PATCH" });
    await loadOrder();
    setActionLoading(false);
  }

  async function handleFlag() {
    const notes = window.prompt("Describe the irregularity (optional):") || undefined;
    setActionLoading(true);
    await fetch(`/api/admin/sales/${params.orderId}/flag`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    await loadOrder();
    setActionLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#f6f8fb]">
        <AdminSidebar />
        <div className="flex-1 p-8 text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen bg-[#f6f8fb]">
        <AdminSidebar />
        <div className="flex-1 p-8 text-sm text-red-500">Order not found.</div>
      </div>
    );
  }

  const canAct = order.status === "PENDING_VERIFICATION";

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title={`Transaction Audit: TX-${order.id.slice(-4)}`} />

        <main className="p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="mb-4 text-sm font-bold text-slate-900">Order Details</h2>
                <div className="space-y-2 text-sm">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-slate-500">
                        {item.product.name} (x{item.quantity})
                      </span>
                      <span className="font-medium text-slate-800">
                        Rs.{(Number(item.unitPriceAtOrder) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-base">
                    <span className="font-bold text-slate-900">Total Paid</span>
                    <span className="font-bold text-blue-600">Rs.{Number(order.totalAmount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900">Buyer Information</h3>
                  <p className="mt-2 text-sm font-medium text-slate-800">{order.buyerName}</p>
                  <p className="text-xs text-slate-500">{order.buyerPhone}</p>
                  <p className="mt-1 text-xs text-slate-500">{order.deliveryLocation}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <h3 className="text-sm font-bold text-slate-900">Seller Information</h3>
                  <p className="mt-2 text-sm font-medium text-slate-800">
                    {order.business.entrepreneurProfile.user.name} ({order.business.businessName})
                  </p>
                  <p className="text-xs text-slate-500">{order.business.entrepreneurProfile.user.email}</p>
                  <p className="mt-1 text-xs text-blue-600">{order.business.entrepreneurProfile.university}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-3 text-sm font-bold text-slate-900">Verification Audit Trail</h3>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li>• {new Date(order.createdAt).toLocaleString()} — Order Created</li>
                  {order.salesConfirmation && (
                    <li>
                      • {new Date(order.salesConfirmation.deliveryDate).toLocaleString()} — Fulfillment Proof
                      Submitted by {order.business.entrepreneurProfile.user.name}
                    </li>
                  )}
                  {order.salesConfirmation?.verifiedAt && (
                    <li>
                      • {new Date(order.salesConfirmation.verifiedAt).toLocaleString()} —{" "}
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
                  <img
                    src={order.salesConfirmation.proofImageUrl}
                    alt="Delivery proof"
                    className="w-full object-cover"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500">No proof submitted yet.</p>
              )}

              {canAct ? (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={handleFlag}
                    disabled={actionLoading}
                    className="w-full rounded-md bg-red-500 py-2.5 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-60"
                  >
                    Flag Irregularity
                  </button>
                  <button
                    onClick={handleVerify}
                    disabled={actionLoading}
                    className="w-full rounded-md bg-emerald-500 py-2.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
                  >
                    Confirm & Release
                  </button>
                </div>
              ) : (
                <p className="mt-4 text-center text-xs font-semibold text-slate-500">
                  This order is already {order.status.toLowerCase()}.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => router.back()}
            className="mt-6 text-xs font-semibold text-blue-600 hover:underline"
          >
            ← Back to Sales Verification
          </button>
        </main>
      </div>
    </div>
  );
}
