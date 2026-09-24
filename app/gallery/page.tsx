"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/public/Navbar";
import Footer from "@/components/public/Footer";

type GalleryItem = {
  id: string;
  imageUrl: string;
  caption: string | null;
};

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGallery() {
      try {
        const response = await fetch("/api/gallery");
        const data = await response.json();
        if (response.ok) setItems(data.galleryItems);
      } catch (error) {
        console.error("Load gallery error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadGallery();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F7FA]">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-bold text-slate-900">Gallery</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Explore moments from our student entrepreneur community — businesses,
          products, events, and campus activities captured in action.
        </p>

        {loading ? (
          <p className="mt-8 text-sm text-slate-500">Loading gallery...</p>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            No gallery images yet. Once an admin uploads some (Admin Gallery
            Management), they'll appear here.
          </div>
        ) : (
          <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
            {items.map((item) => (
              <div key={item.id} className="mb-4 break-inside-avoid overflow-hidden rounded-xl">
                <img src={item.imageUrl} alt={item.caption || "Gallery image"} className="w-full object-cover" />
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
