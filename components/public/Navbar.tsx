"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, ShoppingCart, X } from "lucide-react";

import { useCart } from "@/lib/cart-context";

// Shared navbar for public pages (Home, Marketplace, Categories, Gallery,
// About, Product Details). "use client" because it needs the cart count,
// the search box's interactivity, and the current page (to highlight the
// active nav tab).
//
// Responsive approach: the header wraps onto a second line if everything
// doesn't fit on one — logo+cart+buttons stay on the first line, nav
// links wrap below on narrower screens. Nothing is ever hidden or cut
// off, at any window width.
//
// SEARCH: previously hidden below 1280px (which meant it disappeared on
// almost every laptop, all tablets, and all phones — not just small
// screens). Now shown inline from 768px up, and as a toggleable icon
// below that, so search is always reachable regardless of screen size.
export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { totalItemCount } = useCart();
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/marketplace/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setMobileSearchOpen(false);
    }
  }

  // "/" only counts as active on the exact Home page; every other link
  // also stays highlighted on its own sub-pages (e.g. /marketplace/search
  // still highlights "Marketplace", /categories/art still highlights
  // "Categories").
  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/marketplace", label: "Marketplace" },
    { href: "/categories", label: "Categories" },
    { href: "/gallery", label: "Gallery" },
    { href: "/about", label: "About" },
  ];

  return (
    <header className="border-b border-slate-200 bg-gradient-to-r from-blue-200 via-white to-orange-200">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-2 gap-x-4 px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <img src="/images/startup-spark-logo.png" alt="StartupSpark" className="h-10 w-10 rounded" />
          <span className="whitespace-nowrap text-lg font-bold text-slate-900">
            Startup<span className="text-blue-600">Spark</span>
          </span>
        </Link>


        <nav className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-slate-600 md:order-none md:w-auto">

        <nav className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-600 md:order-none md:w-auto">

          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isActive(link.href)
                  ? "border-b-2 border-blue-600 pb-0.5 font-semibold text-blue-600"
                  : "border-b-2 border-transparent pb-0.5 hover:text-slate-900"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Inline search — visible from 768px (md) up. Narrower to
              start (w-28) so it takes up less room right when it first
              appears, widening again once there's more space to spare. */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1.5 md:flex"
          >
            <Search size={14} className="text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search student products & services..."
              className="w-28 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 lg:w-44 xl:w-52"
            />
          </form>

          {/* Mobile/tablet search — a toggleable icon below 768px, so
              search is never completely unreachable at any screen size. */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((open) => !open)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 md:hidden"
            aria-label="Toggle search"
          >
            {mobileSearchOpen ? <X size={18} className="text-slate-600" /> : <Search size={18} className="text-slate-600" />}
          </button>

          <Link href="/cart" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-slate-100">
            <ShoppingCart size={18} className="text-slate-600" />
            {totalItemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white">
                {totalItemCount > 9 ? "9+" : totalItemCount}
              </span>
            )}
          </Link>

          <Link
            href="/admin/login"
            className="shrink-0 whitespace-nowrap rounded-md bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Admin Login
          </Link>

          <Link
            href="/entrepreneur/login"
            className="shrink-0 whitespace-nowrap rounded-md bg-orange-500 px-2.5 py-2 text-xs font-semibold text-white hover:bg-orange-600"
          >
            Sell With Us
          </Link>
        </div>

        {/* Expanded mobile search row — only rendered below 768px when
            the search icon above is tapped, full-width beneath the rest
            of the header. */}
        {mobileSearchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            className="order-4 flex w-full items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 md:hidden"
          >
            <Search size={14} className="text-slate-400" />
            <input
              autoFocus
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search student products & services..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </form>
        )}
      </div>
    </header>
  );
}
