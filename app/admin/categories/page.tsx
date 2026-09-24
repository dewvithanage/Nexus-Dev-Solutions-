"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type Category = {
  id: string;
  name: string;
  description: string | null;
  productCount: number;
};

// Simplified from the Figma's "Category Tree Configurator" (which showed
// nested sub-categories) — our data model only supports one flat level
// of categories (a Product belongs to exactly one Category), so this
// manages that flat list instead of a tree. Adding true sub-categories
// would need a real schema change (a parentId on Category) that wasn't
// part of the original requirements.
export default function CategoryManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const response = await fetch("/api/admin/categories");
      const data = await response.json();
      if (response.ok) {
        setCategories(data.categories);
        if (data.categories.length > 0 && !selectedId) {
          selectCategory(data.categories[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  function selectCategory(category: Category) {
    setSelectedId(category.id);
    setName(category.name);
    setDescription(category.description || "");
    setError("");
  }

  async function handleAddNew() {
    const newName = window.prompt("New category name:");
    if (!newName) return;

    const response = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });

    const data = await response.json();
    if (response.ok) {
      await loadCategories();
      selectCategory(data.category);
    } else {
      alert(data.message);
    }
  }

  async function handleSave() {
    if (!selectedId) return;
    setSaving(true);
    setError("");

    const response = await fetch(`/api/admin/categories/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });

    const data = await response.json();
    if (response.ok) {
      await loadCategories();
    } else {
      setError(data.message);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!confirm("Delete this category? This can't be undone.")) return;

    const response = await fetch(`/api/admin/categories/${selectedId}`, { method: "DELETE" });
    const data = await response.json();

    if (response.ok) {
      setSelectedId(null);
      await loadCategories();
    } else {
      alert(data.message);
    }
  }

  const selectedCategory = categories.find((c) => c.id === selectedId);

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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Categories</h2>
                <button
                  onClick={handleAddNew}
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={12} /> Add Category
                </button>
              </div>

              {loading ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : (
                <div className="space-y-1.5">
                  {categories
                    .filter((category) => {
                      const term = searchTerm.trim().toLowerCase();
                      return term === "" || category.name.toLowerCase().includes(term);
                    })
                    .map((category) => (
                    <button
                      key={category.id}
                      onClick={() => selectCategory(category)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition ${
                        selectedId === category.id
                          ? "bg-blue-50 font-semibold text-blue-700"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{category.name}</span>
                      <span className="text-xs text-slate-400">{category.productCount} items</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              {!selectedCategory ? (
                <p className="text-sm text-slate-500">Select a category on the left to edit it.</p>
              ) : (
                <>
                  <h2 className="mb-4 text-sm font-bold text-slate-900">
                    Editing details for &ldquo;{selectedCategory.name}&rdquo;
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">Category Title</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">Description</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-24 w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600"
                      />
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    <div className="flex justify-between pt-2">
                      <button
                        onClick={handleDelete}
                        className="rounded-md bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100"
                      >
                        Delete Category
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-md bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
