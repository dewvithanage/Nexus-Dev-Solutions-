import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Clock3, CircleCheck, DollarSign, TrendingUp } from "lucide-react";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import RecentOrders from "@/components/entrepreneur/dashboard/RecentOrders";
import Notifications from "@/components/entrepreneur/dashboard/Notifications";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function formatRupees(amount: number) {
  return `Rs.${amount.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Server Component: reads the session and the entrepreneur's real figures
// straight from the database. Every number on this page is calculated from
// their own products and orders. Only approved entrepreneurs get here
// (see ../layout.tsx).
export default async function EntrepreneurDashboardPage() {
  const user = await getCurrentUser();
  const profile = user?.entrepreneurProfile;
  const businessId = profile?.business?.id;

  if (!user || user.role !== "ENTREPRENEUR" || !profile || !businessId) {
    redirect("/entrepreneur/login");
  }

  const now = Date.now();
  const startOfThisWeek = new Date(now - WEEK_MS);
  const startOfLastWeek = new Date(now - 2 * WEEK_MS);

  const [
    activeProducts,
    pendingProducts,
    productsAddedThisWeek,
    completedSales,
    salesThisWeek,
    salesLastWeek,
    revenue,
    revenueThisWeek,
  ] = await Promise.all([
    prisma.product.count({ where: { businessId, status: "APPROVED" } }),
    prisma.product.count({ where: { businessId, status: "PENDING" } }),
    prisma.product.count({ where: { businessId, createdAt: { gte: startOfThisWeek } } }),
    prisma.order.count({ where: { businessId, status: "VERIFIED" } }),
    prisma.order.count({ where: { businessId, status: "VERIFIED", createdAt: { gte: startOfThisWeek } } }),
    prisma.order.count({
      where: { businessId, status: "VERIFIED", createdAt: { gte: startOfLastWeek, lt: startOfThisWeek } },
    }),
    prisma.order.aggregate({ where: { businessId, status: "VERIFIED" }, _sum: { totalAmount: true } }),
    prisma.order.aggregate({
      where: { businessId, status: "VERIFIED", createdAt: { gte: startOfThisWeek } },
      _sum: { totalAmount: true },
    }),
  ]);

  const totalRevenue = Number(revenue._sum.totalAmount ?? 0);
  const weekRevenue = Number(revenueThisWeek._sum.totalAmount ?? 0);
  const salesChange =
    salesLastWeek > 0 ? Math.round(((salesThisWeek - salesLastWeek) / salesLastWeek) * 100) : null;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <Sidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader />

        <main className="p-4 sm:p-6 lg:p-8">
          <section className="flex min-h-[130px] flex-col items-start justify-between gap-4 rounded-xl bg-[#2d67e8] px-5 py-6 text-white sm:flex-row sm:items-center sm:px-8">
            <div>
              <h2 className="text-[20px] font-bold sm:text-[22px]">Welcome back, {user.name}! ⚡</h2>
              <p className="mt-2 max-w-[650px] text-xs leading-5 text-blue-100">
                {salesThisWeek > 0
                  ? `You completed ${salesThisWeek} verified sale${salesThisWeek === 1 ? "" : "s"} this week. Keep up the amazing student hustle!`
                  : activeProducts > 0
                  ? `You have ${activeProducts} product${activeProducts === 1 ? "" : "s"} live in the marketplace.`
                  : "Add your first product to start selling on campus."}
              </p>
            </div>

            <Link
              href="/entrepreneur/products/add"
              className="shrink-0 rounded-md bg-[#f5a900] px-6 py-3 text-xs font-bold text-slate-950 transition hover:bg-[#e99f00]"
            >
              Add Product
            </Link>
          </section>

          <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Total Products</p>
                <Package size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{activeProducts} Active</h3>
              <p className="mt-1 text-[10px] text-slate-500">{pendingProducts} Pending Review</p>
              {productsAddedThisWeek > 0 && (
                <div className="mt-3 flex items-center gap-1 text-[10px] text-emerald-500">
                  <TrendingUp size={12} />+{productsAddedThisWeek} added this week
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Pending Approvals</p>
                <Clock3 size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{pendingProducts}</h3>
              <p className="mt-1 text-[10px] text-slate-500">Products waiting for admin review</p>
              {pendingProducts > 0 && <p className="mt-3 text-[10px] text-amber-500">◉ Admin review in progress</p>}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Completed Sales</p>
                <CircleCheck size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">
                {completedSales} Order{completedSales === 1 ? "" : "s"}
              </h3>
              <p className="mt-1 text-[10px] text-slate-500">Verified by an admin</p>
              {salesChange !== null && (
                <div
                  className={`mt-3 flex items-center gap-1 text-[10px] ${
                    salesChange >= 0 ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  <TrendingUp size={12} />
                  {salesChange >= 0 ? "+" : ""}
                  {salesChange}% vs last week
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">Total Revenue</p>
                <DollarSign size={17} className="text-blue-600" />
              </div>
              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">{formatRupees(totalRevenue)}</h3>
              <p className="mt-1 text-[10px] text-slate-500">Campus Escrow Cleared</p>
              {weekRevenue > 0 && (
                <div className="mt-3 flex items-center gap-1 text-[10px] text-emerald-500">
                  <TrendingUp size={12} />+{formatRupees(weekRevenue)} this week
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[3fr_1fr]">
            <RecentOrders />
            <Notifications userId={user.id} />
          </section>
        </main>
      </div>
    </div>
  );
}
