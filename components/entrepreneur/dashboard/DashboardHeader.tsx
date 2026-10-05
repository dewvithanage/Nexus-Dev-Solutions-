"use client";

import Link from "next/link";
import { Bell, Search } from "lucide-react";

type DashboardHeaderProps = {
  title?: string;
  // Optional extras, used by the admin pages. Entrepreneur pages pass only
  // a title and get the plain header, exactly as before.
  notificationsHref?: string;
  onSearch?: (value: string) => void;
  searchPlaceholder?: string;
};

export default function DashboardHeader({
  title = "Entrepreneur Dashboard",
  notificationsHref,
  onSearch,
  searchPlaceholder = "Search...",
}: DashboardHeaderProps) {
  return (
    <header className="flex h-[46px] shrink-0 items-center justify-between gap-4 border-b border-[#E2E8F0] bg-white px-5">
      <h1 className="text-[16px] font-bold text-[#172033]">{title}</h1>

      {(onSearch || notificationsHref) && (
        <div className="flex items-center gap-3">
          {onSearch && (
            <div className="relative">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                onChange={(event) => onSearch(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 w-56 rounded-md border border-[#E2E8F0] bg-white pl-8 pr-3 text-[12px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-600"
              />
            </div>
          )}

          {notificationsHref && (
            <Link
              href={notificationsHref}
              aria-label="Notifications"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              <Bell size={16} />
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
