"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  TrendingUp,
  Trophy,
  LayoutGrid,
  FileImage,
  Tag,
  BarChart3,
  Bell,
  LogOut,
  ExternalLink,
} from "lucide-react";

// Same visual pattern as the entrepreneur Sidebar.tsx (dark background,
// same active/hover styles) so the two portals feel like one product —
// just with admin-specific menu items instead of entrepreneur ones.
const menuItems = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Entrepreneurs", href: "/admin/entrepreneurs", icon: Users },
  { name: "Products", href: "/admin/products", icon: Package },
  { name: "Sales", href: "/admin/sales", icon: TrendingUp },
  { name: "Rankings", href: "/admin/rankings", icon: Trophy },
  { name: "Content", href: "/admin/content", icon: LayoutGrid },
  { name: "Gallery", href: "/admin/gallery", icon: FileImage },
  { name: "Categories", href: "/admin/categories", icon: Tag },
  { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "Notifications", href: "/admin/notifications", icon: Bell },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    // Reuses the SAME logout route entrepreneurs use — it just clears the
    // session cookie, which works the same regardless of role.
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <aside className="flex h-screen w-[230px] shrink-0 flex-col bg-[#0D1B33] px-4 py-5 text-white">
      <Link href="/" className="mb-8 flex items-center gap-3 rounded-md px-2 py-1 transition hover:bg-[#162A49]">
        <img
          src="/images/startup-spark-logo.png"
          alt="StartupSpark Logo"
          className="h-9 w-9 rounded object-cover"
        />
        <div>
          <p className="text-[14px] font-bold leading-tight text-white">StartupSpark</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-400">Admin</p>
        </div>
      </Link>

      <nav className="flex flex-col gap-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex h-[40px] items-center gap-3 rounded-md px-4 text-[12.5px] transition ${
                active
                  ? "bg-[#2867E8] font-medium text-white"
                  : "text-[#C3CEE0] hover:bg-[#162A49] hover:text-white"
              }`}
            >
              <Icon size={16} strokeWidth={1.8} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        {/* FIX: there was previously no way to get back to the public
            site from the admin portal at all, other than manually
            editing the URL or using browser back (which could lose
            in-progress form data). Opens in a new tab so the admin
            session/page state isn't lost either way. */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex h-[40px] items-center gap-3 rounded-md border-t border-[#1E2E4A] px-4 pt-3 text-[12.5px] text-[#8FA0BA] transition hover:bg-[#162A49] hover:text-white"
        >
          <ExternalLink size={16} strokeWidth={1.8} />
          <span>View Public Site</span>
        </a>
      </nav>

      <div className="mt-auto pt-4">
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
