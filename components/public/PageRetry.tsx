"use client";
export default function PageRetry({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
    <h1 className="text-xl font-bold text-slate-900">Unable to load this page</h1>
    <p role="alert" className="text-sm text-slate-600">Please try again in a moment.</p>
    <button onClick={reset} className="rounded-md bg-blue-600 px-5 py-2 text-white">Try again</button>
  </main>;
}
