import Link from "next/link";
export default function MissingRecord() {
  return <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
    <h1 className="text-xl font-bold">This page is unavailable</h1>
    <p className="text-sm text-slate-600">The record may be missing, private, or no longer available.</p>
    <Link href="/marketplace" className="text-blue-600 underline">Back to marketplace</Link>
  </main>;
}
