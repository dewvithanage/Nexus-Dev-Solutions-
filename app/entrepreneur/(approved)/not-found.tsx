import Link from "next/link";

// Shown when a seller page calls notFound(): a product or order id that
// doesn't exist, or that belongs to another seller. The wording doesn't say
// which, so ids from other shops reveal nothing.
export default function EntrepreneurNotFound() {
  return (
    <main className="min-h-dvh bg-[#F5F7FA] px-4 py-10">
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Not found</h1>
        <p className="mt-2 text-sm text-slate-500">
          We couldn&apos;t find that in your shop. It may have been removed, or the link may be wrong.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/entrepreneur/products"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            My products
          </Link>
          <Link
            href="/entrepreneur/dashboard"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
