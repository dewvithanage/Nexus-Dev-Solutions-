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
            Startup<span className="text-blue-600">Spark</span>
          </span>
        </Link>

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
          </Link>
        </div>
      </div>
    </header>
  );
}
