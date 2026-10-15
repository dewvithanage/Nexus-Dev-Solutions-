import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { getOrderConfirmation } from "@/lib/dewmi-page-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order Confirmation | StartupSpark", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function OrderConfirmationPage({ params, searchParams }: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const [{ orderId }, query] = await Promise.all([params, searchParams]);
  const order = await getOrderConfirmation(orderId, typeof query.token === "string" ? query.token : "");
  if (!order) notFound();
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
          <div className="w-full rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Check className="text-green-600" size={24} />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-slate-900">Order Saved Successfully!</h1>
              <p className="mt-2 max-w-sm text-sm text-slate-500">
                Your order is saved. Open WhatsApp below and send the message to <span className="font-semibold">{order.entrepreneurName}</span> to arrange payment and pickup.
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
      </main>

      <Footer />
    </div>
  );
}
