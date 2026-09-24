"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Bell, Search } from "lucide-react";

type DashboardHeaderProps = {
  title?: string;
  // Both new and OPTIONAL — pages that don't pass them keep working
  // exactly as before (bell not clickable, search box inert). Pages
  // that DO pass them get real functionality. This avoids having to
  // touch every single page that renders this shared header just to
  // ship the fix for the ones that actually needed it.
  notificationsHref?: string;
  onSearch?: (term: string) => void;
  searchPlaceholder?: string;
};

export default function DashboardHeader({
  title = "Entrepreneur Dashboard",
  notificationsHref,
  onSearch,
  searchPlaceholder = "Search anything...",
}: DashboardHeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch?.(searchTerm.trim());
  }

  return (
    <header className="flex h-[46px] shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-5">
      <h1 className="text-[16px] font-bold text-[#172033]">{title}</h1>

      <div className="flex items-center gap-3">
        <form
          onSubmit={handleSearchSubmit}
          className="flex h-[28px] w-[190px] items-center gap-2 rounded-md border border-[#DCE3EC] bg-[#F8FAFC] px-3"
        >
          <Search size={12} className="text-[#8492A6]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              // Live-filter as they type, not just on Enter — feels more
              // responsive for a short list like a product/entrepreneur
              // directory. Pressing Enter still works too (see the form
              // above), for anyone used to that pattern.
              onSearch?.(event.target.value.trim());
            }}
            placeholder={searchPlaceholder}
            disabled={!onSearch}
            className="w-full bg-transparent text-[9px] text-[#475569] outline-none placeholder:text-[#94A3B8] disabled:cursor-not-allowed"
          />
        </form>

        {notificationsHref ? (
          <Link
            href={notificationsHref}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#F8FAFC] text-[#475569] transition hover:bg-slate-200"
          >
            <Bell size={14} />
          </Link>
        ) : (
          <button
            type="button"
            className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#F8FAFC] text-[#475569]"
          >
            <Bell size={14} />
          </button>
        )}
      </div>
    </header>
  );
}
