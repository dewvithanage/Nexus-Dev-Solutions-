export default function CategoriesLoading() {
  return (
    <main
      className="min-h-screen bg-[#F5F7FA] px-6 py-10"
      aria-label="Loading categories"
    >
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="h-8 w-48 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-slate-200" />

        <div className="mt-8 grid grid-cols-2 gap-5 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <div className="mx-auto h-7 w-7 rounded-full bg-slate-200" />
              <div className="mx-auto mt-4 h-4 w-28 max-w-full rounded bg-slate-200" />
              <div className="mx-auto mt-2 h-3 w-20 max-w-full rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}