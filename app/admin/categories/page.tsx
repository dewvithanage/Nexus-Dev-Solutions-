"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import Pagination from "@/components/admin/Pagination";

type Category = { id: string; name: string; slug: string; _count: { products: number } };
type PaginationInfo = { currentPage: number; totalPages: number; totalCount: number };

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, [page]);

  async function loadCategories() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/categories?page=${page}`);
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Load categories error:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredCategories = categories.filter((category) => {
    const term = searchTerm.trim().toLowerCase();
    return term === "" || category.name.toLowerCase().includes(term);
  });

  async function handleAddCategory(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to create category.");
        return;
      }

      setNewCategoryName("");
      setPage(1);
      loadCategories();
    } catch (error) {
      console.error("Create category error:", error);
      setError("Something went wrong. Please try again.");
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(`Delete category "${category.name}"?`);
    if (!confirmed) return;

    setDeletingId(category.id);
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to delete this category.");
        return;
      }

      loadCategories();
    } catch (error) {
      console.error("Delete category error:", error);
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
          title="Category Management"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search categories..."
        />

        <main className="p-8">
          <form onSubmit={handleAddCategory} className="mb-6 flex items-end gap-3 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-700">New Category Name</label>
              <input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="e.g. Music & Instruments"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={14} />
              Add Category
            </button>
          </form>
          {error && <p className="mb-4 text-xs text-red-600">{error}</p>}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {loading ? (
              <p className="p-8 text-sm text-slate-500">Loading categories...</p>
            ) : categories.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No categories yet.</p>
            ) : filteredCategories.length === 0 ? (
              <p className="p-8 text-sm text-slate-500">No categories match your search on this page.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{category.name}</p>
                      <p className="text-xs text-slate-400">{category._count.products} products</p>
                    </div>
                    <button
                      onClick={() => handleDelete(category)}
                      disabled={deletingId === category.id}
                      className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-[10px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={12} />
                      {deletingId === category.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
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
