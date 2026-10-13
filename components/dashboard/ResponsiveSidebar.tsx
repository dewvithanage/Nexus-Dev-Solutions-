"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

type ResponsiveSidebarProps = {
  // Logo/name shown in the phone top bar.
  brand: ReactNode;
  // The sidebar's own content (logo, menu, account, logout).
  children: ReactNode;
};

// Shared shell for the admin and entrepreneur sidebars.
//
// - Laptops (lg and up): the sidebar sits on the left, as it always has.
// - Phones and tablets: a slim top bar with a menu button; the sidebar
//   slides in from the left as a drawer, and closes when a page is chosen,
//   the backdrop is tapped or Escape is pressed.
//
// The page around it uses `flex-col lg:flex-row`, so the top bar sits above
// the content on small screens and the sidebar beside it on large ones.
export default function ResponsiveSidebar({ brand, children }: ResponsiveSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Choosing a page closes the drawer.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // While the drawer is open: Escape closes it, and the page behind it
  // doesn't scroll.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between bg-[#0D1B33] px-4 text-white lg:hidden">
        {brand}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="dashboard-sidebar"
          className="flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-[#162A49] focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400"
        >
          <Menu size={22} />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="dashboard-sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-[85vw] shrink-0 flex-col overflow-y-auto bg-[#0D1B33] px-4 py-5 text-white transition-transform duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[230px] lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md text-[#C3CEE0] hover:bg-[#162A49] hover:text-white lg:hidden"
        >
          <X size={20} />
        </button>
        {children}
      </aside>
    </>
  );
}
