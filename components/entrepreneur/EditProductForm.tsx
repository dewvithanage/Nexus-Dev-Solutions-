"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X } from "lucide-react";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import type { EditableProduct, SidebarEntrepreneur } from "@/lib/entrepreneur-data";

type Category = { id: string; name: string };

type ProductImage = { id: string; url: string };

// The Edit Product form. The page (a Server Component) has already loaded
// this seller's product and the categories on the server and passes them
// in, so the form is filled in as soon as it appears.
export default function EditProductForm({
  product,
  categories,
  sidebar,
}: {
  product: EditableProduct;
  categories: Category[];
  sidebar: SidebarEntrepreneur;
}) {
  const router = useRouter();
  const params = { productId: product.id };

  const [existingImages, setExistingImages] = useState<ProductImage[]>(product.images);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([]);
  const status = product.status;

  const [form, setForm] = useState({
    name: product.name,
    categoryId: product.categoryId,
    price: String(product.price),
    description: product.description,
    stockQuantity: String(product.stockQuantity),
    tags: product.tags.join(", "),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [stockError, setStockError] = useState("");

  // FIX: this is the shared rule used both live (as the user types) and
  // again on submit — a whole number, 0 or greater. Returns an error
  // message string, or "" if the value is valid.
  function validateStockQuantity(rawValue: string): string {
    if (rawValue.trim() === "") {
      return "Stock quantity is required.";
    }
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      return "Stock quantity must be a valid number.";
    }
    if (!Number.isInteger(parsed)) {
      return "Stock quantity must be a whole number greater than or equal to 0.";
    }
    if (parsed < 0) {
      return "Stock quantity cannot be negative.";
    }
    return "";
  }

  function handleStockChange(rawValue: string) {
    setForm({ ...form, stockQuantity: rawValue });
    setStockError(validateStockQuantity(rawValue));
  }

  function handleNewImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const room = 4 - existingImages.length - newFiles.length;
    const filesToAdd = files.slice(0, Math.max(0, room));

    setNewFiles((previous) => [...previous, ...filesToAdd]);
    setNewPreviewUrls((previous) => [...previous, ...filesToAdd.map((file) => URL.createObjectURL(file))]);
  }

  // Hidden straight away, but only deleted on the server when the form is
  // submitted (DELETE /api/products/mine/[productId]/images/[imageId]), so
  // pressing Cancel keeps the image.
  function removeExistingImage(imageId: string) {
    setExistingImages((previous) => previous.filter((image) => image.id !== imageId));
    setRemovedImageIds((previous) => [...previous, imageId]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!form.name || !form.categoryId || !form.price || !form.description || !form.stockQuantity) {
      setError("Please fill in all required fields.");
      return;
    }

    // FIX: block submission entirely on an invalid stock quantity —
    // matches the same rule the server enforces, so the user sees the
    // problem immediately instead of waiting for a round trip.
    const stockValidationMessage = validateStockQuantity(form.stockQuantity);
    if (stockValidationMessage) {
      setStockError(stockValidationMessage);
      setError(stockValidationMessage);
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

      // Removals go first, so they free up slots for the new images.
      for (const imageId of removedImageIds) {
        const removeResponse = await fetch(`/api/products/mine/${params.productId}/images/${imageId}`, {
          method: "DELETE",
        });
        if (!removeResponse.ok) {
          const removeData = await removeResponse.json().catch(() => ({}));
          setError(`Changes saved, but an image couldn't be removed: ${removeData.message || "please try again"}`);
          return;
        }
      }

      if (newFiles.length > 0) {
        const imageFormData = new FormData();
        newFiles.forEach((file) => imageFormData.append("images", file));
        const imageResponse = await fetch(`/api/products/${params.productId}/images`, {
          method: "POST",
          body: imageFormData,
        });
        if (!imageResponse.ok) {
          const imageData = await imageResponse.json().catch(() => ({}));
          setError(`Changes saved, but the new images couldn't be added: ${imageData.message || "upload failed"}`);
          return;
        }
      }

      alert("Product updated and resubmitted for review!");
      router.push("/entrepreneur/products");
      // Drops the browser's cached copies of the other seller pages, so the
      // dashboard counts and status page show the change too.
      router.refresh();
    } catch (error) {
      console.error("Update product error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:flex-row bg-[#F5F7FA]">
      <Sidebar entrepreneur={sidebar} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Edit Product Catalog" />

        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6">
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
                  min="0"
                  step="1"
                  value={form.stockQuantity}
                  onChange={(e) => handleStockChange(e.target.value)}
                  className={`w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:border-blue-600 ${
                    stockError ? "border-red-400" : "border-slate-300"
                  }`}
                />
                {stockError && <p className="mt-1.5 text-xs text-red-600">{stockError}</p>}
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
                  disabled={saving || !!stockError}
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
