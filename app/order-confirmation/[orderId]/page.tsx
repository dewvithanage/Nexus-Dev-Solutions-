"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { buildWhatsAppLink } from "@/lib/whatsapp";

type OrderDetails = {
  id: string;
  totalAmount: number;
  deliveryLocation: string;
  entrepreneurName: string;
  entrepreneurWhatsApp: string;
  items: { productName: string; quantity: number; unitPrice: number }[];
};

// This page is where Shehani's checkout flow (Order Form → "Send Order via
// WhatsApp") should redirect to after creating the Order in the database —
// see Risk 5 in the architecture doc: the order must be saved BEFORE
// redirecting here, since we can't know if the WhatsApp message is
// actually sent.
export default function OrderConfirmationPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        const response = await fetch(`/api/orders/${params.orderId}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.message || "Unable to load order.");
          return;
        }

        setOrder(data.order);
      } catch (error) {
        console.error("Load order error:", error);
        setError("Something went wrong loading your order.");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [params.orderId]);

  const firstItem = order?.items[0];
  const whatsAppMessage = order
    ? `Hi ${order.entrepreneurName}, I just placed an order (#${order.id.slice(-6)}) on StartupSpark for ${firstItem?.productName}${
        order.items.length > 1 ? ` and ${order.items.length - 1} other item(s)` : ""
      }. Total: Rs.${Number(order.totalAmount).toFixed(2)}. Pickup: ${order.deliveryLocation}.`
    : "";

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-16">
        {loading ? (
          <p className="text-sm text-slate-500">Loading your order...</p>
        ) : error || !order ? (
          <div className="w-full rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-red-600">{error || "Order not found."}</p>
            <Link href="/marketplace" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline">
              Back to Marketplace
            </Link>
          </div>
        ) : (
          <div className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="text-green-600" size={24} />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-slate-900">Order Sent Successfully!</h1>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Your order has been sent to <span className="font-semibold">{order.entrepreneurName}</span> via
                WhatsApp. They will contact you shortly to confirm your order.
              </p>
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-100 pt-6">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">Order Details</h2>

              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {item.productName} (x{item.quantity})
                  </span>
                  <span className="font-medium text-slate-900">
                    Rs.{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Pickup / Handoff spot</span>
                <span className="font-medium text-slate-900">{order.deliveryLocation}</span>
              </div>

              <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
                <span className="font-bold text-slate-900">Total Price</span>
                <span className="font-bold text-blue-600">Rs.{Number(order.totalAmount).toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Link
                href="/marketplace"
                className="flex-1 rounded-md border border-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-blue-600 hover:bg-blue-50"
              >
                Continue Shopping
              </Link>
              <a
                href={buildWhatsAppLink(order.entrepreneurWhatsApp, whatsAppMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-md bg-green-500 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-green-600"
              >
                Open WhatsApp
              </a>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
