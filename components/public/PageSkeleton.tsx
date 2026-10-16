export default function PageSkeleton() {
  return <div role="status" aria-label="Loading page" className="mx-auto w-full max-w-6xl space-y-5 px-6 py-10">
    <p className="text-sm text-slate-500">Loading...</p>
    <div aria-hidden="true" className="h-8 w-48 animate-pulse rounded bg-slate-200" />
    <div aria-hidden="true" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-48 animate-pulse rounded-xl bg-slate-100" />)}</div>
  </div>;
}
