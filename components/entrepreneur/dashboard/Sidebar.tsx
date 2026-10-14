"use client";

import Link from "next/link";
import ResponsiveSidebar from "@/components/dashboard/ResponsiveSidebar";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  UserRound,
  Package,
  CirclePlus,
  TrendingUp,
  Bell,
  LogOut,
  ExternalLink,
  Clock3,
} from "lucide-react";

import type { SidebarEntrepreneur } from "@/lib/entrepreneur-data";

const menuItems = [
  { name: "Dashboard", href: "/entrepreneur/dashboard", icon: LayoutDashboard },
  { name: "Business Profile", href: "/entrepreneur/profile", icon: UserRound },
  { name: "My Products", href: "/entrepreneur/products", icon: Package },
  { name: "Add Product", href: "/entrepreneur/products/add", icon: CirclePlus },
  { name: "Sales & Orders", href: "/entrepreneur/orders", icon: TrendingUp },
  { name: "Notifications", href: "/entrepreneur/notifications", icon: Bell },
];

// Until an admin approves the account, only these pages are open to it
// (the seller pages redirect to the application status page).
const pendingMenuItems = [
  { name: "Application Status", href: "/entrepreneur/application-status", icon: Clock3 },
  { name: "Business Profile", href: "/entrepreneur/profile", icon: UserRound },
];

// The signed-in entrepreneur comes from the page, which read it from the
// server-side session while rendering (lib/entrepreneur-data.ts). This used
// to be fetched from /api/auth/me in the browser after every page load,
// which cost an extra request and showed "Entrepreneur" until it arrived.
// Optional only so the loading skeleton can show the sidebar shell.
export default function Sidebar({ entrepreneur = null }: { entrepreneur?: SidebarEntrepreneur | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/entrepreneur/login");
    // Drops the browser's cached copies of the private pages, so Back
    // can't show them after signing out.
    router.refresh();
  }

  return (
    <ResponsiveSidebar
      brand={
        <Link href="/" className="flex items-center gap-2.5">
          <img src="/images/startup-spark-logo.png" alt="" className="h-8 w-8 rounded object-cover" />
          <span className="text-[15px] font-bold">StartupSpark</span>
        </Link>
      }
    >
      <Link href="/" className="mb-8 flex items-center gap-3 rounded-md px-2 py-1 transition hover:bg-[#162A49]">
        <img
          src="/images/startup-spark-logo.png"
          alt="StartupSpark Logo"
          className="h-9 w-9 rounded object-cover"
        />
        <span className="text-[16px] font-bold text-white">StartupSpark</span>
      </Link>

      <nav className="flex flex-col gap-2">
        {(entrepreneur && entrepreneur.status !== "APPROVED" ? pendingMenuItems : menuItems).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex h-[44px] items-center gap-4 rounded-md px-4 text-[13px] transition ${
                active
                  ? "bg-[#2867E8] font-medium text-white"
                  : "text-[#C3CEE0] hover:bg-[#162A49] hover:text-white"
              }`}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* FIX: there was previously no way to get back to the public
            site from the entrepreneur portal at all. Opens in a new tab
            so the entrepreneur's current page/form state isn't lost
            either way. */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex h-[44px] items-center gap-4 rounded-md border-t border-[#1E2E4A] px-4 pt-3 text-[13px] text-[#8FA0BA] transition hover:bg-[#162A49] hover:text-white"
        >
          <ExternalLink size={17} strokeWidth={1.8} />
          <span>View Public Site</span>
        </a>
      </nav>

      <div className="mt-auto">
        <div className="mb-4 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2867E8] text-sm font-bold text-white">
            {entrepreneur?.fullName ? entrepreneur.fullName.charAt(0).toUpperCase() : "E"}
          </div>

          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-white">
              {entrepreneur?.fullName || "Entrepreneur"}
            </p>
            <p className="truncate text-[10px] text-[#8FA0BA]">
              {entrepreneur?.businessName || "StartupSpark Seller"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex h-[42px] w-full items-center gap-3 rounded-md px-4 text-[12px] font-medium text-[#FF6B6B] transition hover:bg-[#162A49]"
        >
          <LogOut size={16} strokeWidth={1.8} />
          <span>Logout</span>
        </button>
      </div>
    </ResponsiveSidebar>
  );
}
