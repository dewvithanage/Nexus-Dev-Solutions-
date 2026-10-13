"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Menu, Search, ShoppingCart, X } from "lucide-react";

import { useCart } from "@/lib/cart-context";

// Shared navbar for public pages (Home, Marketplace, Categories, Gallery,
// About, Product Details). "use client" because it needs the cart count,
// the search box's interactivity, and the current page (to highlight the
// active nav tab).
//
// Responsive approach: from 768px (md) up, everything sits in the header
// as before. On phones the header is a single row (logo, search, cart,
// menu button), and the page links plus the two sign-in buttons open in a
// panel below it, so the header doesn't take up a third of the screen.
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Going to another page closes the phone menu.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-y-2 gap-x-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <img src="/images/startup-spark-logo.png" alt="StartupSpark" className="h-10 w-10 rounded" />
          <span className="whitespace-nowrap text-lg font-bold text-slate-900">
            Startup<span className="text-blue-600">Spark</span>
          </span>
        </Link>


        <nav className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-slate-600 md:flex">

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
            onClick={() => {
              setMobileSearchOpen((open) => !open);
              setMobileMenuOpen(false);
            }}
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
            className="hidden shrink-0 whitespace-nowrap rounded-md bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 md:block"
          >
            Admin Login
          </Link>

          <Link
            href="/entrepreneur/login"
            className="hidden shrink-0 whitespace-nowrap rounded-md bg-orange-500 px-2.5 py-2 text-xs font-semibold text-white hover:bg-orange-600 md:block"
          >
            Sell With Us
          </Link>

          {/* Phone menu button — below 768px the links live in a panel. */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((open) => !open);
              setMobileSearchOpen(false);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-slate-100 md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="public-mobile-menu"
          >
            {mobileMenuOpen ? <X size={20} className="text-slate-700" /> : <Menu size={20} className="text-slate-700" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav id="public-mobile-menu" className="order-4 flex w-full flex-col gap-1 border-t border-slate-200 pt-2 md:hidden">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2.5 text-sm font-medium ${
                  isActive(link.href) ? "bg-blue-50 text-blue-600" : "text-slate-700 hover:bg-white/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2 pb-1">
              <Link
                href="/entrepreneur/login"
                className="rounded-md bg-orange-500 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-orange-600"
              >
                Sell With Us
              </Link>
              <Link
                href="/admin/login"
                className="rounded-md bg-blue-600 px-3 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Admin Login
              </Link>
            </div>
          </nav>
        )}

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
