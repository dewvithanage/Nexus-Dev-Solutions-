"use client";

import { useEffect, useState } from "react";
import { Upload, Trash2 } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type GalleryItem = {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
};

export default function AdminGalleryManagementPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // FIX: header search box was previously decorative. Filters by caption.
  const filteredItems = items.filter((item) => {
    const term = searchTerm.trim().toLowerCase();
    return term === "" || (item.caption || "").toLowerCase().includes(term);
  });

  useEffect(() => {
    loadGallery();
  }, []);

  async function loadGallery() {
    try {
      const response = await fetch("/api/gallery");
      const data = await response.json();
      if (response.ok) setItems(data.galleryItems);
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  }

  async function handleUpload() {
    if (!file) return;

    setUploading(true);
    setSuccessMessage("");

    const formData = new FormData();
    formData.append("image", file);
    formData.append("caption", caption);

    const response = await fetch("/api/admin/gallery", { method: "POST", body: formData });

    if (response.ok) {
      setFile(null);
      setPreviewUrl(null);
      setCaption("");
      setSuccessMessage("Image successfully added to the public gallery! Refresh public client views to inspect.");
      await loadGallery();
    }

    setUploading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this image from the gallery?")) return;

    const response = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    if (response.ok) {
      setItems((previous) => previous.filter((item) => item.id !== id));
    }
  }

  return (
    <div className="flex min-h-screen bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Gallery Management"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search by caption..."
        />

        <main className="p-8">
          <h1 className="mb-1 text-lg font-bold text-slate-900">Manage public gallery images</h1>
          <p className="mb-5 text-xs text-slate-500">
            Photos here appear on the public /gallery page for all visitors to see.
          </p>

          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Upload New Moment</h2>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
              <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/40">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-full w-full rounded-md object-contain p-2" />
                ) : (
                  <>
                    <Upload size={22} className="text-blue-500" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">Click to browse or drag & drop files</p>
                    <p className="mt-1 text-xs text-slate-400">PNG, JPG or WEBP up to 5MB</p>
                  </>
                )}
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="hidden" />
              </label>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">Image Title</label>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Enter a descriptive title"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
                />

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleUpload}
                    disabled={!file || uploading}
                    className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  >
                    {uploading ? "Saving..." : "Save Image"}
                  </button>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                      setCaption("");
                    }}
                    className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {successMessage && (
            <div className="mb-5 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              ✓ {successMessage}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-sm text-slate-500">Loading gallery...</p>
            ) : items.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No images uploaded yet.</p>
            ) : filteredItems.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No images match your search.</p>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#f8fafc]">
                  <tr className="text-[10px] font-semibold text-slate-500">
                    <th className="px-5 py-3">Preview</th>
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Date Added</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="text-[12px] text-slate-600">
                      <td className="px-5 py-3">
                        <div className="h-12 w-12 overflow-hidden rounded-md bg-slate-100">
                          <img src={item.imageUrl} alt={item.caption || ""} className="h-full w-full object-cover" />
                        </div>
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-800">{item.caption || "Untitled"}</td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
