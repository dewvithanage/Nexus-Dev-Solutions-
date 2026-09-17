"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X } from "lucide-react";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

type Category = { id: string; name: string };

type ProductImage = { id: string; url: string };

export default function EditProductPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [businessName, setBusinessName] = useState("");

  const [form, setForm] = useState({
    name: "",
    categoryId: "",
    price: "",
    description: "",
    stockQuantity: "",
    tags: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [productResponse, categoriesResponse] = await Promise.all([
          fetch(`/api/products/mine/${params.productId}`),
          fetch("/api/categories"),
        ]);
        const productData = await productResponse.json();
        const categoriesData = await categoriesResponse.json();

        if (categoriesResponse.ok) setCategories(categoriesData.categories);

        if (productResponse.ok) {
          const p = productData.product;
          setForm({
            name: p.name,
            categoryId: p.categoryId,
            price: String(p.price),
            description: p.description,
            stockQuantity: String(p.stockQuantity),
            tags: (p.tags || []).join(", "),
          });
          setExistingImages(p.images);
          setStatus(p.status);
          setBusinessName(p.category?.name ?? "");
        } else {
          setError(productData.message || "Unable to load product.");
        }
      } catch (error) {
        console.error("Load product error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.productId]);

  function handleNewImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const room = 4 - existingImages.length - newFiles.length;
    const filesToAdd = files.slice(0, Math.max(0, room));

    setNewFiles((previous) => [...previous, ...filesToAdd]);
    setNewPreviewUrls((previous) => [...previous, ...filesToAdd.map((file) => URL.createObjectURL(file))]);
  }

  function removeExistingImage(imageId: string) {
    // Just removes it from the local view for now — actual deletion
    // would need a DELETE endpoint; keeping this simple since the
    // requirements don't call for full image management, just adding.
    setExistingImages((previous) => previous.filter((image) => image.id !== imageId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name || !form.categoryId || !form.price || !form.description || !form.stockQuantity) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/products/mine/${params.productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          categoryId: form.categoryId,
          description: form.description,
          price: Number(form.price),
          stockQuantity: Number(form.stockQuantity),
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to update product.");
        return;
      }

      if (newFiles.length > 0) {
        const imageFormData = new FormData();
        newFiles.forEach((file) => imageFormData.append("images", file));
        await fetch(`/api/products/${params.productId}/images`, { method: "POST", body: imageFormData });
      }

      alert("Product updated and resubmitted for review!");
      router.push("/entrepreneur/products");
    } catch (error) {
      console.error("Update product error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-[#F5F7FA]">
        <Sidebar />
        <div className="flex-1 p-8 text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Edit Product Catalog" />

        <main className="flex-1 overflow-auto px-6 py-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-600">
                <Link href="/entrepreneur/products">MY PRODUCTS</Link> / EDIT
              </p>
              <h1 className="text-lg font-bold text-slate-900">{form.name}</h1>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[10px] font-semibold ${
                status === "APPROVED"
                  ? "bg-emerald-100 text-emerald-600"
                  : status === "REJECTED"
                  ? "bg-red-100 text-red-600"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              {status === "APPROVED" ? "Active & Live" : status}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-[1.7fr_1fr]">
            <section className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-sm font-bold text-slate-900">Product Details</h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Product Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">Category</label>
                    <select
                      value={form.categoryId}
                      onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">Price (Rs.)</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="h-24 w-full resize-none rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Tags / Keywords</label>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="Comma-separated, e.g. iphone, case, silicone"
                    className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-bold text-slate-900">Product Images</h2>
                <div className="flex flex-wrap gap-3">
                  {existingImages.map((image) => (
                    <div key={image.id} className="relative h-20 w-20 overflow-hidden rounded-md border">
                      <img src={image.url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(image.id)}
                        className="absolute right-0.5 top-0.5 rounded-full bg-white/90 p-0.5"
                      >
                        <X size={12} className="text-red-500" />
                      </button>
                    </div>
                  ))}
                  {newPreviewUrls.map((url, index) => (
                    <div key={index} className="h-20 w-20 overflow-hidden rounded-md border-2 border-blue-500">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                  ))}
                  {existingImages.length + newFiles.length < 4 && (
                    <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 text-slate-400">
                      <Plus size={18} />
                      <span className="text-[9px]">Add Image</span>
                      <input type="file" accept="image/png,image/jpeg" multiple onChange={handleNewImages} className="hidden" />
                    </label>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-bold text-slate-900">Inventory & Stock Control</h2>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Current Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={form.stockQuantity}
                  onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                  className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                />
              </section>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
              )}

              <div className="flex gap-3">
                <Link
                  href="/entrepreneur/products"
                  className="flex-1 rounded-md border border-slate-300 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Updating..." : "Update Product"}
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
