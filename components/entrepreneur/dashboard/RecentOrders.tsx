import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function RecentOrders() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const profile = await prisma.entrepreneurProfile.findUnique({
    where: {
      userId: user.id,
    },
    include: {
      business: true,
    },
  });

  if (!profile?.business) {
    return (
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-bold text-[#101828]">
            Recent Orders
          </h2>

          <Link
            href="/entrepreneur/orders"
            className="text-[11px] font-medium text-blue-600 hover:underline"
          >
            View All Orders
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No business found.
        </div>
      </section>
    );
  }

  const recentOrders = await prisma.order.findMany({
    where: {
      businessId: profile.business.id,
    },

    include: {
      items: {
        include: {
          product: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 5,
  });

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-[#101828]">
          Recent Orders
        </h2>

        <Link
          href="/entrepreneur/orders"
          className="text-[11px] font-medium text-blue-600 hover:underline"
        >
          View All Orders
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {recentOrders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              No orders yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              New customer orders will appear here.
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-[#f8fafc]">
              <tr className="text-[10px] text-slate-500">
                <th className="px-5 py-3 font-medium">Order ID</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 text-center font-medium">
                  Quantity
                </th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((order) => {
                const productNames = order.items
                  .map((item) => item.product.name)
                  .join(", ");

                const totalQuantity = order.items.reduce(
                  (total, item) => total + item.quantity,
                  0
                );

                const statusText = order.status
                  .replaceAll("_", " ")
                  .toLowerCase()
                  .replace(/\b\w/g, (letter) => letter.toUpperCase());

               const completed = order.status === "VERIFIED";

                return (
                  <tr
                    key={order.id}
                    className="text-[11px] text-slate-600"
                  >
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      #{order.id.slice(-6).toUpperCase()}
                    </td>

                    <td className="px-5 py-4">
                      {order.buyerName}
                    </td>

                    <td className="px-5 py-4 font-medium text-slate-800">
                      {productNames || "No product"}
                    </td>

                    <td className="px-5 py-4 text-center">
                      {totalQuantity}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[9px] font-medium ${
                          completed
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-amber-100 text-amber-600"
                        }`}
                      >
                        {statusText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}