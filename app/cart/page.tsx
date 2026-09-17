"use client";

import Link from "next/link";
import { Trash2, ShoppingCart as CartIcon } from "lucide-react";

import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { useCart } from "@/lib/cart-context";

// Cart items can come from multiple different entrepreneurs' businesses.
// Since checkout (Order Form) happens per-business — see Risk 2 in the
// architecture doc — this page groups items by business, and each group
// gets its own "Proceed to Order" button leading to that business's
// checkout page.
export default function ShoppingCartPage() {
  const { items, removeItem, updateQuantity } = useCart();

  const groupedByBusiness = items.reduce<Record<string, typeof items>>((groups, item) => {
    if (!groups[item.businessId]) groups[item.businessId] = [];
    groups[item.businessId].push(item);
    return groups;
  }, {});

  const businessGroups = Object.entries(groupedByBusiness);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900">Your Shopping Cart</h1>
        <p className="mt-1 text-sm text-slate-500">Supporting student businesses one checkout at a time.</p>

        {businessGroups.length === 0 ? (
          <div className="mt-10 rounded-xl border border-slate-200 bg-white p-12 text-center">
            <CartIcon size={40} className="mx-auto text-slate-300" />
            <h2 className="mt-4 text-lg font-bold text-slate-800">Your cart is feeling light</h2>
            <p className="mt-2 text-sm text-slate-500">
              Explore handcrafted work, tech tool licenses, and bakes by campus student geniuses.
            </p>
            <Link
              href="/marketplace"
              className="mt-5 inline-block rounded-md border border-blue-600 px-5 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {businessGroups.map(([businessId, businessItems]) => {
              const subtotal = businessItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

              return (
                <div key={businessId} className="rounded-xl border border-slate-200 bg-white p-5">
                  <h2 className="mb-4 text-sm font-bold text-slate-900">
                    {businessItems[0].businessName}
                  </h2>

                  <div className="space-y-4">
                    {businessItems.map((item) => (
                      <div key={item.productId} className="flex items-center gap-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          )}
                        </div>

                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-400">Unit Price: Rs.{item.price.toFixed(2)}</p>
                        </div>

                        <div className="flex items-center rounded-md border border-slate-300">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="px-2.5 py-1 text-sm"
                          >
                            -
                          </button>
                          <span className="px-3 text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="px-2.5 py-1 text-sm"
                          >
                            +
                          </button>
                        </div>

                        <p className="w-20 text-right text-sm font-bold text-blue-600">
                          Rs.{(item.price * item.quantity).toFixed(2)}
                        </p>

                        <button onClick={() => removeItem(item.productId)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                    <p className="text-sm font-bold text-slate-900">Subtotal: Rs.{subtotal.toFixed(2)}</p>
                    <Link
                      href={`/checkout/${businessId}`}
                      className="rounded-md bg-orange-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-orange-600"
                    >
                      Proceed to Order
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}


