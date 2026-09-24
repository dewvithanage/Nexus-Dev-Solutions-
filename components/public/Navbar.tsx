<<<<<<< HEAD
import Link from "next/link";
import { Search } from "lucide-react";

// Shared navbar for public pages (Home, Marketplace, Categories, Gallery,
// About). Matches the Figma header. Cart/user icons are placeholders until
// Shehani's cart page and a real "logged in" state exist.
export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <img src="/images/startup-spark-logo.png" alt="StartupSpark" className="h-8 w-8 rounded" />
          <span className="text-lg font-bold text-slate-900">
=======
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, ShoppingCart } from "lucide-react";

import { useCart } from "@/lib/cart-context";

// Shared navbar for public pages (Home, Marketplace, Categories, Gallery,
// About, Product Details). "use client" because it needs the cart count,
// the search box's interactivity, and the current page (to highlight the
// active nav tab).
//
// Responsive approach: rather than hiding nav links or buttons at
// certain widths (which either loses functionality or still overlaps
// depending on exact width), the header wraps onto a second line if
// everything doesn't fit on one — logo+cart+buttons stay on the first
// line, nav links wrap below on narrower screens. Nothing is ever
// hidden or cut off, at any window width.
export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { totalItemCount } = useCart();
  const [searchTerm, setSearchTerm] = useState("");

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/marketplace/search?q=${encodeURIComponent(searchTerm.trim())}`);
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
>>>>>>> origin/Dev
            Startup<span className="text-blue-600">Spark</span>
          </span>
        </Link>

<<<<<<< HEAD
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <Link href="/marketplace" className="hover:text-slate-900">Marketplace</Link>
          <Link href="/categories" className="hover:text-slate-900">Categories</Link>
          <Link href="/gallery" className="hover:text-slate-900">Gallery</Link>
          <Link href="/about" className="hover:text-slate-900">About</Link>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-500 lg:flex">
            <Search size={14} />
            <span>Search student products & services...</span>
          </div>
          <Link
            href="/entrepreneur/login"
            className="rounded-md bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600"
          >
            Post Product
=======
        <nav className="order-3 flex w-full flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-slate-600 md:order-none md:w-auto">
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

        <div className="flex shrink-0 items-center gap-2">
          <form
            onSubmit={handleSearchSubmit}
            className="hidden items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 xl:flex"
          >
            <Search size={14} className="text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search student products & services..."
              className="w-44 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </form>

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
            className="shrink-0 whitespace-nowrap rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Admin Login
          </Link>

          <Link
            href="/entrepreneur/login"
            className="shrink-0 whitespace-nowrap rounded-md bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
          >
            Sell With Us
>>>>>>> origin/Dev
          </Link>
        </div>
      </div>
    </header>
  );
}
