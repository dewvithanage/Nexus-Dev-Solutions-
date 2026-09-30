"use client";

import { useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { useCart } from "@/lib/cart-context";

export default function OrderFormPage() {
  const params = useParams<{ businessId: string }>();
  const router = useRouter();
  const { items, clearBusinessItems } = useCart();

  const businessItems = items.filter((item) => item.businessId === params.businessId);
  const businessName = businessItems[0]?.businessName ?? "this business";
  const totalDue = businessItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [messageToEntrepreneur, setMessageToEntrepreneur] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!buyerName || !buyerPhone || !deliveryLocation) {
      setError("Please fill in all required fields.");
      return;
    }

    if (businessItems.length === 0) {
      setError("Your cart for this business is empty.");
      return;
    }

    try {
      setLoading(true);

      // Order is saved to the database FIRST, before anything about
      // WhatsApp happens — see Risk 5 in the architecture doc. This way
      // the entrepreneur sees the order in their dashboard even if the
      // buyer never actually sends the WhatsApp message.
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: params.businessId,
          buyerName,
          buyerPhone,
          deliveryLocation,
          messageToEntrepreneur,
          items: businessItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to place order.");
        return;
      }

      clearBusinessItems(params.businessId);
      router.push(`/order-confirmation/${data.orderId}`);
    } catch (error) {
      console.error("Place order error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h1 className="text-xl font-bold text-slate-900">Contact & Delivery Details</h1>
            <p className="mt-1 text-xs text-slate-500">
              Direct WhatsApp connection details. The student entrepreneur will verify details instantly.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  value={buyerName}
                  onChange={(event) => setBuyerName(event.target.value)}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Contact Number (WhatsApp Enabled)
                </label>
                <input
                  value={buyerPhone}
                  onChange={(event) => setBuyerPhone(event.target.value)}
                  placeholder="+94 77 123 4567"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  On-Campus Delivery / Handoff Location
                </label>
                <textarea
                  value={deliveryLocation}
                  onChange={(event) => setDeliveryLocation(event.target.value)}
                  placeholder="e.g. Main Library entrance, Thursday afternoon"
                  className="h-20 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Message to Student Entrepreneur
                </label>
                <input
                  value={messageToEntrepreneur}
                  onChange={(event) => setMessageToEntrepreneur(event.target.value)}
                  placeholder="Any special requests?"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
                />
              </div>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-green-500 py-3 text-sm font-bold text-white hover:bg-green-600 disabled:opacity-60"
              >
                <MessageCircle size={16} />
                {loading ? "Placing order..." : "Send Order via WhatsApp"}
              </button>
              <p className="text-center text-[11px] text-slate-400">
                Your order details will be sent to the entrepreneur via WhatsApp for confirmation.
              </p>
            </form>
          </div>

          <div className="h-fit rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">Your Selection</h2>
            <p className="mt-1 text-xs text-slate-500">{businessName}</p>

            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              {businessItems.map((item) => (
                <div key={item.productId} className="flex justify-between text-xs">
                  <span className="text-slate-600">{item.name} (x{item.quantity})</span>
                  <span className="font-medium text-slate-800">
                    Rs.{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="font-bold text-slate-900">Total Due</span>
              <span className="font-bold text-blue-600">Rs.{totalDue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
