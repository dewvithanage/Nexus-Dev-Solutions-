"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import Pagination from "@/components/admin/Pagination";
import { useQueryNavigation } from "@/components/admin/useQueryNavigation";
import type { CategoriesList } from "@/lib/admin/content";

type Category = CategoriesList["categories"][number];

// The interactive part of Category Management. The list arrives already
// loaded from the server; after adding or deleting, the page is
// re-rendered on the server so it shows what is really saved.
export default function CategoriesView({ data }: { data: CategoriesList }) {
  const { categories, pagination } = data;
  const { isPending, setQuery, refresh } = useQueryNavigation();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const term = searchTerm.trim().toLowerCase();
  const filteredCategories = categories.filter((category) => term === "" || category.name.toLowerCase().includes(term));

  async function handleAddCategory(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!newCategoryName.trim()) return;

    setAdding(true);
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Unable to create category.");
        return;
      }

      setNewCategoryName("");
      // Categories are listed A–Z, so the new one may be on any page; go
      // back to the first page and fetch the list again.
      if (pagination.currentPage === 1) refresh();
      else setQuery({ page: null });
    } catch (error) {
      console.error("Create category error:", error);
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(`Delete category "${category.name}"?`);
    if (!confirmed) return;

    setError("");
    setDeletingId(category.id);
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Unable to delete this category.");
        return;
      }

      refresh();
    } catch (error) {
      console.error("Delete category error:", error);
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-[#f6f8fb]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <DashboardHeader
          title="Category Management"
          notificationsHref="/admin/notifications"
          onSearch={setSearchTerm}
          searchPlaceholder="Search categories..."
        />

        <main className="p-4 sm:p-6 lg:p-8">
          <form onSubmit={handleAddCategory} className="mb-6 flex items-end gap-3 rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex-1">
              <label htmlFor="new-category" className="mb-1 block text-xs font-semibold text-slate-700">
                New Category Name
              </label>
              <input
                id="new-category"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="e.g. Music & Instruments"
                maxLength={60}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="flex items-center gap-1 rounded-md bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <Plus size={14} />
              {adding ? "Adding..." : "Add Category"}
            </button>
          </form>
          {error && (
            <p role="alert" className="mb-4 text-xs text-red-600">
              {error}
            </p>
          )}

          <div
            className={`overflow-hidden rounded-xl border border-slate-200 bg-white transition-opacity ${
              isPending ? "opacity-50" : ""
            }`}
            aria-busy={isPending}
          >
            {categories.length === 0 ? (
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

          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => setQuery({ page })}
          />
        </main>
      </div>
    </div>
  );
}
