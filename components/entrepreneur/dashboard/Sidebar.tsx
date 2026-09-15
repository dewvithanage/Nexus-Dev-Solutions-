"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  UserRound,
  Package,
  CirclePlus,
  TrendingUp,
  Bell,
  LogOut,
} from "lucide-react";

const menuItems = [
  { name: "Dashboard", href: "/entrepreneur/dashboard", icon: LayoutDashboard },
  { name: "Business Profile", href: "/entrepreneur/profile", icon: UserRound },
  { name: "My Products", href: "/entrepreneur/products", icon: Package },
  { name: "Add Product", href: "/entrepreneur/products/add", icon: CirclePlus },
  { name: "Sales & Orders", href: "/entrepreneur/orders", icon: TrendingUp },
  { name: "Notifications", href: "/entrepreneur/notifications", icon: Bell },
];

type LoggedInEntrepreneur = {
  fullName: string;
  businessName: string | null;
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [entrepreneur, setEntrepreneur] = useState<LoggedInEntrepreneur | null>(null);

  // Load the logged-in entrepreneur from the session (via the API),
  // not from localStorage — the login cookie is httpOnly so the browser
  // can't read it directly with JavaScript, which is what makes it safer.
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        setEntrepreneur(data.user);
      } catch (error) {
        console.error("Unable to load entrepreneur details:", error);
      }
    }

    loadCurrentUser();
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/entrepreneur/login");
  }

  return (
    <aside className="flex h-screen w-[230px] shrink-0 flex-col bg-[#0D1B33] px-4 py-5 text-white">
      <div className="mb-8 flex items-center gap-3 px-2">
        <img
          src="/images/startup-spark-logo.png"
          alt="StartupSpark Logo"
          className="h-9 w-9 rounded object-cover"
        />
        <span className="text-[16px] font-bold text-white">StartupSpark</span>
      </div>

      <nav className="flex flex-col gap-2">
        {menuItems.map((item) => {
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
    </aside>
  );
}
