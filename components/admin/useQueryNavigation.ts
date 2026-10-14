"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// For server-rendered admin pages: tabs and page numbers live in the URL
// (?status=VERIFIED&page=2), so changing them asks the server for fresh
// data. isPending is true while that new data is on its way, so the page
// can show it is updating instead of looking stuck.
export function useQueryNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setQuery(updates: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, String(value));
    }
    const query = params.toString();
    startTransition(() => router.push(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  // Re-renders the page on the server after a change (add, delete,
  // verify...), so what the admin sees comes from the database.
  function refresh() {
    startTransition(() => router.refresh());
  }

  return { isPending, setQuery, refresh };
}
