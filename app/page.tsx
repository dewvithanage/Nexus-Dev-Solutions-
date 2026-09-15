import Link from "next/link";

// TEMPORARY placeholder. This is Shehani's page (#1 — Home, from the
// Figma design). Replace this file entirely with the real homepage —
// nothing here needs to be preserved.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-10 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Startup Spark</h1>
      <p className="max-w-md text-sm text-slate-500">
        Public homepage not built yet — see the Figma design and the team
        architecture doc for page 1 (Home).
      </p>
      <Link
        href="/entrepreneur/login"
        className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Entrepreneur Login
      </Link>
    </main>
  );
}
