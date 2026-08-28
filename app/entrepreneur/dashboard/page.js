"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  Package,
  Clock3,
  CircleCheck,
  DollarSign,
  TrendingUp,
} from "lucide-react";

import Sidebar from "../../../components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "../../../components/entrepreneur/dashboard/DashboardHeader";
import RecentOrders from "../../../components/entrepreneur/dashboard/RecentOrders";
import Notifications from "../../../components/entrepreneur/dashboard/Notifications";

export default function EntrepreneurDashboardPage() {
  // Logged entrepreneur details
  const [entrepreneur, setEntrepreneur] = useState(null);

  useEffect(() => {
    // Read logged entrepreneur from local storage
    const savedEntrepreneur = localStorage.getItem("entrepreneur");

    if (savedEntrepreneur) {
      setEntrepreneur(JSON.parse(savedEntrepreneur));
    }
  }, []);

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">

      {/* Dark sidebar */}
      <Sidebar />

      {/* Main dashboard */}
      <div className="min-w-0 flex-1">

        <DashboardHeader />

        <main className="p-8">

          {/* Welcome banner */}
          <section className="flex min-h-[130px] items-center justify-between rounded-xl bg-[#2d67e8] px-8 text-white">

            <div>
              <h2 className="text-[22px] font-bold">
                Welcome back,{" "}
                {entrepreneur?.fullName || "Entrepreneur"}! ⚡
              </h2>

              <p className="mt-2 max-w-[650px] text-xs leading-5 text-blue-100">
                Your tech accessory shop has received new views and sales
                this week. Keep up the amazing student hustle!
              </p>
            </div>

            <Link
              href="/entrepreneur/products/add"
              className="rounded-md bg-[#f5a900] px-6 py-3 text-xs font-bold text-slate-950 transition hover:bg-[#e99f00]"
            >
              Add Product
            </Link>

          </section>

          {/* Statistic cards */}
          <section className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">

            {/* Total Products */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Total Products
                </p>

                <Package size={17} className="text-blue-600" />
              </div>

              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">
                14 Active
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                2 Pending Review
              </p>

              <div className="mt-3 flex items-center gap-1 text-[10px] text-emerald-500">
                <TrendingUp size={12} />
                +2 this week
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Pending Approvals
                </p>

                <Clock3 size={17} className="text-blue-600" />
              </div>

              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">
                2
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                Reviewed within 24h
              </p>

              <p className="mt-3 text-[10px] text-amber-500">
                ◉ Admin action required
              </p>
            </div>

            {/* Completed Sales */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Completed Sales
                </p>

                <CircleCheck size={17} className="text-blue-600" />
              </div>

              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">
                128 Orders
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                Instant download / Pickup
              </p>

              <div className="mt-3 flex items-center gap-1 text-[10px] text-emerald-500">
                <TrendingUp size={12} />
                +14% vs last week
              </div>
            </div>

            {/* Total Revenue */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex justify-between">
                <p className="text-xs font-medium text-slate-500">
                  Total Revenue
                </p>

                <DollarSign size={17} className="text-blue-600" />
              </div>

              <h3 className="mt-5 text-[22px] font-bold text-[#101828]">
                Rs.1,536.00
              </h3>

              <p className="mt-1 text-[10px] text-slate-500">
                Campus Escrow Cleared
              </p>

              <div className="mt-3 flex items-center gap-1 text-[10px] text-emerald-500">
                <TrendingUp size={12} />
                +$240.00 this week
              </div>
            </div>

          </section>

          {/* Bottom dashboard content */}
          <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[3fr_1fr]">

            <RecentOrders />

            <Notifications />

          </section>

        </main>
      </div>
    </div>
  );
}