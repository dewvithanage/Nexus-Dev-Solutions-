"use client";

import { Bell, Search } from "lucide-react";

export default function DashboardHeader({
  title = "Entrepreneur Dashboard",
}) {
  return (
    <header className="flex h-[46px] shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-5">

      {/* Current page title */}
      <h1 className="text-[16px] font-bold text-[#172033]">
        {title}
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-3">

        {/* Search box */}
        <div className="flex h-[28px] w-[190px] items-center gap-2 rounded-md border border-[#DCE3EC] bg-[#F8FAFC] px-3">
          <Search
            size={12}
            className="text-[#8492A6]"
          />

          <input
            type="text"
            placeholder="Search anything..."
            className="w-full bg-transparent text-[9px] text-[#475569] outline-none placeholder:text-[#94A3B8]"
          />
        </div>

        {/* Notification button - no number badge */}
        <button
          type="button"
          className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-[#F8FAFC] text-[#475569]"
        >
          <Bell size={14} />
        </button>

      </div>
    </header>
  );
}