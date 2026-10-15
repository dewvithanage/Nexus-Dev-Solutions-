import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";
import { getGalleryPage, pageNumber } from "@/lib/dewmi-page-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gallery | StartupSpark" };
export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const page = pageNumber((await searchParams).page);
  const { items, totalPages } = await getGalleryPage(page);
  if (page > 1 && page > totalPages) notFound();
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Gallery</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Explore moments from our student entrepreneur community — businesses,
          products, events, and campus activities captured in action.
        </p>

        {items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No gallery images yet. Check back soon for updates from our community.
          </div>
        ) : (
          <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {items.map((item, index) => (
              <div key={item.id} className="mb-4 break-inside-avoid overflow-hidden rounded-xl">
                <Image priority={page === 1 && index === 0} src={item.imageUrl} alt={item.caption || "Gallery image"} width={1200} height={900} sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="h-auto w-full object-cover" />
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && <nav aria-label="Gallery pages" className="mt-8 flex justify-center gap-6 text-sm text-blue-600">
          {page > 1 && <Link href={`/gallery?page=${page - 1}`}>Previous</Link>}
          <span className="text-slate-600">Page {page} of {totalPages}</span>
          {page < totalPages && <Link href={`/gallery?page=${page + 1}`}>Next</Link>}
        </nav>}
      </main>

      <Footer />
    </div>
  );
}
