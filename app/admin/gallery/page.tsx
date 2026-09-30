"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import Pagination from "@/components/admin/Pagination";

type GalleryItem = { id: string; imageUrl: string; caption: string | null; createdAt: string };
type PaginationInfo = { currentPage: number; totalPages: number; totalCount: number };

export default function AdminGalleryManagementPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, [page]);

  async function loadItems() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/gallery?page=${page}`);
      const data = await response.json();
      if (response.ok) {
        setItems(data.items);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Load gallery error:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = items.filter((item) => {
    const term = searchTerm.trim().toLowerCase();
    return term === "" || (item.caption || "").toLowerCase().includes(term);
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  }

  async function handleUpload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("caption", caption);

      const response = await fetch("/api/admin/gallery", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to upload image.");
        return;
      }

      setFile(null);
      setPreviewUrl(null);
      setCaption("");
      setSuccessMessage("Image uploaded successfully!");
      setTimeout(() => setSuccessMessage(""), 2500);
      setPage(1);
      loadItems();
    } catch (error) {
      console.error("Upload error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(item: GalleryItem) {
    const confirmed = window.confirm("Remove this image from the gallery?");
    if (!confirmed) return;

    setDeletingId(item.id);
    try {
      const response = await fetch(`/api/admin/gallery/${item.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        alert(data.message || "Unable to delete this image.");
        return;
      }
      loadItems();
    } catch (error) {
      console.error("Delete gallery item error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setDeletingId(null);
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
          <form onSubmit={handleUpload} className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Upload New Image</h2>
            <div className="flex flex-wrap items-end gap-4">
              <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/40">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-full w-full rounded-md object-cover" />
                ) : (
                  <Plus size={20} className="text-blue-500" />
                )}
                <input type="file" accept="image/png,image/jpeg" onChange={handleFileChange} className="hidden" />
              </label>

              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Caption</label>
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="e.g. Startup Pitch Night 2026"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={!file || uploading}
                className="rounded-md bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Save Image"}
              </button>
            </div>
            {successMessage && <p className="mt-2 text-xs text-emerald-600">{successMessage}</p>}
          </form>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-sm text-slate-500">Loading gallery...</p>
            ) : items.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No images uploaded yet.</p>
            ) : filteredItems.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No images match your search on this page.</p>
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
                      <td className="px-5 py-3">{item.caption || "—"}</td>
                      <td className="px-5 py-3 text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          {deletingId === item.id ? "Removing..." : "Remove"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {pagination && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          )}
        </main>
      </div>
    </div>
  );
}
