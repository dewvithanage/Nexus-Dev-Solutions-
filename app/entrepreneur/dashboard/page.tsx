import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Clock3, CircleCheck, DollarSign } from "lucide-react";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import RecentOrders from "@/components/entrepreneur/dashboard/RecentOrders";
import Notifications from "@/components/entrepreneur/dashboard/Notifications";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// This is a Server Component (no "use client"), so it can read the
// session directly on the server — no need for a client-side fetch just
// to know who's logged in.
export default async function EntrepreneurDashboardPage() {
  const user = await getCurrentUser();
  const business = user?.entrepreneurProfile?.business;

  // middleware.ts already redirects when there is no valid session cookie.
  // This also covers a valid cookie whose account no longer exists, or that
  // is not an entrepreneur account.
  if (!user || user.role !== "ENTREPRENEUR" || !business) {
    redirect("/entrepreneur/login");
  }

  // Real numbers for the stat cards, counted in the database rather than
  // by loading every product and order. Revenue counts only orders an
  // admin has VERIFIED, matching the Sales & Orders page.
  const [productCounts, orderCounts] = await Promise.all([
    prisma.product.groupBy({
      by: ["status"],
      where: { businessId: business.id },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["status"],
      where: { businessId: business.id },
      _count: { _all: true },
      _sum: { totalAmount: true },
    }),
  ]);

  const productsWith = (status: string) =>
    productCounts.find((row) => row.status === status)?._count._all ?? 0;
  const ordersWith = (status: string) => orderCounts.find((row) => row.status === status);

  const activeProducts = productsWith("APPROVED");
  const pendingProducts = productsWith("PENDING");
  const rejectedProducts = productsWith("REJECTED");
  const completedOrders = ordersWith("VERIFIED")?._count._all ?? 0;
  const awaitingVerification = ordersWith("PENDING_VERIFICATION")?._count._all ?? 0;
  const totalRevenue = Number(ordersWith("VERIFIED")?._sum.totalAmount ?? 0);
  const openOrders =
    (ordersWith("PENDING")?._count._all ?? 0) + (ordersWith("AWAITING_FULFILLMENT")?._count._all ?? 0);

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader />

        <main className="p-8">
          <section className="flex min-h-[130px] items-center justify-between rounded-xl bg-[#2d67e8] px-8 text-white">
            <div>
              <h2 className="text-[22px] font-bold">
                Welcome back, {user.name || "Entrepreneur"}! ⚡
              </h2>
              <p className="mt-2 max-w-[650px] text-xs leading-5 text-blue-100">
                Here is how {business.businessName} is doing. Keep up the
                amazing student hustle!
              </p>
            </div>

            <Link
              href="/entrepreneur/products/add"
              className="rounded-md bg-[#f5a900] px-6 py-3 text-xs font-bold text-slate-950 transition hover:bg-[#e99f00]"
            >
              Add Product
            </Link>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Total Products</p>
                <Package size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{activeProducts} Active</h3>
              <p className="mt-1 text-[10px] text-slate-500">{pendingProducts} Pending Review</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Pending Approvals</p>
                <Clock3 size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{pendingProducts}</h3>
              <p className="mt-1 text-[10px] text-slate-500">
                {rejectedProducts} rejected, needing changes
              </p>
              {pendingProducts > 0 && (
                <p className="mt-3 text-[10px] text-amber-500">◉ Admin action required</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Completed Sales</p>
                <CircleCheck size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{completedOrders} Orders</h3>
              <p className="mt-1 text-[10px] text-slate-500">
                {awaitingVerification} awaiting verification, {openOrders} open
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Total Revenue</p>
                <DollarSign size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">
                Rs.{totalRevenue.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">From admin-verified sales</p>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[3fr_1fr]">
            <RecentOrders businessId={business.id} />
            <Notifications userId={user.id} />
          </section>
        </main>
      </div>
    </div>
  );
}
