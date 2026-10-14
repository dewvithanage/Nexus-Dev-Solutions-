import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type Layout = "table" | "stats" | "detail" | "split";

// Shown by each admin page's loading.tsx while the server fetches its data.
// The sidebar and header appear straight away, with grey placeholder
// blocks shaped like the content that is coming.
export default function AdminPageSkeleton({ title, layout = "table" }: { title: string; layout?: Layout }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader title={title} notificationsHref="/admin/notifications" />

        <main className="p-4 sm:p-6 lg:p-8" aria-busy="true" aria-live="polite">
          <span className="sr-only">Loading {title}…</span>
          <div className="animate-pulse">
            {layout === "stats" && <StatsSkeleton />}
            {layout === "table" && <TableSkeleton />}
            {layout === "detail" && <DetailSkeleton />}
            {layout === "split" && <SplitSkeleton />}
          </div>
        </main>
      </div>
    </div>
  );
}

const Block = ({ className }: { className: string }) => <div className={`rounded-md bg-slate-200 ${className}`} />;

function TableSkeleton() {
  return (
    <>
      <div className="mb-5 flex gap-2">
        <Block className="h-8 w-28" />
        <Block className="h-8 w-24" />
        <Block className="h-8 w-28" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <Block className="h-9 w-full rounded-none bg-slate-100" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-t border-slate-100 px-5 py-4">
            <Block className="h-3 w-32" />
            <Block className="h-3 w-40" />
            <Block className="h-3 flex-1" />
            <Block className="h-6 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}

function StatsSkeleton() {
  return (
    <>
      <div className="mb-6 flex justify-between">
        <Block className="h-5 w-56" />
        <Block className="h-8 w-64" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
            <Block className="h-3 w-28" />
            <Block className="mt-5 h-6 w-32" />
            <Block className="mt-2 h-2 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="h-60 rounded-xl border border-slate-200 bg-white p-5"><Block className="h-full w-full bg-slate-100" /></div>
        <div className="h-60 rounded-xl border border-slate-200 bg-white p-5"><Block className="h-full w-full bg-slate-100" /></div>
      </div>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <div className="h-40 rounded-xl border border-slate-200 bg-white p-6"><Block className="h-full w-full bg-slate-100" /></div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="h-28 rounded-xl border border-slate-200 bg-white" />
          <div className="h-28 rounded-xl border border-slate-200 bg-white" />
        </div>
        <div className="h-32 rounded-xl border border-slate-200 bg-white" />
      </div>
      <div className="h-80 rounded-xl border border-slate-200 bg-white p-5"><Block className="h-full w-full bg-slate-100" /></div>
    </div>
  );
}

function SplitSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <div className="mb-4 flex gap-2">
          <Block className="h-8 w-24" />
          <Block className="h-8 w-28" />
          <Block className="h-8 w-28" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
            <Block className="h-3 w-48" />
            <Block className="mt-2 h-2 w-72" />
          </div>
        ))}
      </div>
      <div className="h-48 rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
