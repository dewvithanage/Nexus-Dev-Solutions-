"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Info, Image as ImageIcon, Plus } from "lucide-react";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import type { SidebarEntrepreneur } from "@/lib/entrepreneur-data";
import { uploadProductImages } from "@/lib/upload-product-images";

type Category = {
  id: string;
  name: string;
};

type ProductFormData = {
  name: string;
  categoryId: string;
  price: string;
  description: string;
  tags: string;
  stockQuantity: string;
};

type DeliveryOptions = {
  pickup: boolean;
  dropoff: boolean;
  posting: boolean;
};

// The Add Product form. The page (a Server Component) loads the categories
// on the server and passes them in, so the dropdown is filled as soon as the
// page appears instead of after a /api/categories request.
export default function AddProductForm({
  categories,
  sidebar,
}: {
  categories: Category[];
  sidebar: SidebarEntrepreneur;
}) {
  const router = useRouter();

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    categoryId: categories[0]?.id ?? "",
    price: "",
    description: "",
    tags: "",
    stockQuantity: "",
  });

  const [delivery, setDelivery] = useState<DeliveryOptions>({
    pickup: false,
    dropoff: false,
    posting: false,
  });

  // Real image upload now (see lib/upload.ts + /api/products/[id]/images) —
  // this used to only preview locally (Risk 6 in the architecture doc).
  // Keep the actual File objects so we can upload them after the product
  // itself is created, plus preview URLs just for showing thumbnails.
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setFormData((previousData) => ({ ...previousData, [name]: value }));
  }

  function handleDeliveryChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, checked } = event.target;
    setDelivery((previousData) => ({ ...previousData, [name]: checked }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    // Cap at 4 total, matching the "Upload up to 4 high-res photos" note
    // on this page and the limit enforced server-side.
    const combined = [...selectedFiles, ...files].slice(0, 4);
    setSelectedFiles(combined);
    setPreviewUrls(combined.map((file) => URL.createObjectURL(file)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    // No need to read localStorage for the entrepreneur's id anymore —
    // the /api/products route reads it from the login session cookie.

    if (
      !formData.name ||
      !formData.categoryId ||
      !formData.price ||
      !formData.description ||
      !formData.stockQuantity
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (Number(formData.price) <= 0) {
      setError("Price must be greater than 0.");
      return;
    }

    if (Number(formData.stockQuantity) < 0) {
      setError("Quantity cannot be negative.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          categoryId: formData.categoryId,
          description: formData.description,
          price: Number(formData.price),
          stockQuantity: Number(formData.stockQuantity),
          onCampusPickup: delivery.pickup,
          areaDropOff: delivery.dropoff,
          postingEnabled: delivery.posting,
          tags: formData.tags
            ? formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
            : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to add product.");
        return;
      }

      // Product is created first, THEN images are uploaded against its
      // real id — this two-step order is necessary since the image
      // upload endpoint needs a product to attach images to.
      if (selectedFiles.length > 0 && data.product?.id) {
        const upload = await uploadProductImages(data.product.id, selectedFiles);

        if (!upload.ok) {
          // The product itself was created; tell the person why the images
          // weren't added so they can add them from Edit Product.
          alert(
            `Product submitted, but the images couldn't be added: ${upload.message} You can add them from Edit Product.`
          );
          router.push("/entrepreneur/products");
          router.refresh();
          return;
        }
      }

      alert("Product submitted successfully!");
      // The products page is rendered fresh on the server; refresh() also
      // drops the browser's cached copies (e.g. the dashboard counts).
      router.push("/entrepreneur/products");
      router.refresh();
    } catch (error) {
      console.error("Product submission error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:flex-row bg-[#F5F7FA]">
      <Sidebar entrepreneur={sidebar} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Add New Product" />

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="mb-4 flex min-h-[36px] items-center gap-2 rounded-md border border-[#F2B84B] bg-[#FFF8E7] px-3">
              <Info size={14} className="shrink-0 text-[#F2A500]" />
              <p className="text-[10px] font-medium text-[#344054]">
                <span className="font-bold">Notice:</span> All student products must be
                reviewed by the campus administrator before publishing live on the feed.
                Usually approved in under 24 hours!
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)]">
              {/* LEFT SIDE */}
              <div className="space-y-4">
                <section className="rounded-lg border border-[#D8E0EA] bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-[15px] font-bold text-[#172033]">
                    Product Information
                  </h2>

                  <div className="mb-3">
                    <label className="mb-1.5 block text-[11px] font-semibold text-[#24344C]">
                      Product Name
                      <span className="text-red-500"> *</span>
                    </label>

                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Homemade Chocolate Brownies"
                      className="h-10 w-full rounded-md border border-[#AFC0D3] bg-white px-3 text-[12px] font-medium text-[#172033] outline-none placeholder:text-[#7B8A9C] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div className="mb-3 grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-[#24344C]">
                        Category
                        <span className="text-red-500"> *</span>
                      </label>

                      <select
                        name="categoryId"
                        value={formData.categoryId}
                        onChange={handleChange}
                        className="h-10 w-full rounded-md border border-[#AFC0D3] bg-white px-3 text-[12px] font-medium text-[#172033] outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                      >
                        {categories.length === 0 && (
                          <option value="">No categories yet. An admin needs to add one.</option>
                        )}
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold text-[#24344C]">
                        Price (Rs.)
                        <span className="text-red-500"> *</span>
                      </label>

                      <input
                        type="number"
                        name="price"
                        min="1"
                        value={formData.price}
                        onChange={handleChange}
                        placeholder="e.g. 1500.00"
                        className="h-10 w-full rounded-md border border-[#AFC0D3] bg-white px-3 text-[12px] font-medium text-[#172033] outline-none placeholder:text-[#7B8A9C] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="mb-1.5 block text-[11px] font-semibold text-[#24344C]">
                      Detailed Description
                      <span className="text-red-500"> *</span>
                    </label>

                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Describe your product..."
                      className="h-[82px] w-full resize-none rounded-md border border-[#AFC0D3] bg-white px-3 py-2 text-[12px] font-medium leading-5 text-[#172033] outline-none placeholder:text-[#7B8A9C] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold text-[#24344C]">
                      Tags & Keywords
                    </label>

                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      placeholder="Brownies, Chocolate, Homemade, Dessert"
                      className="h-10 w-full rounded-md border border-[#AFC0D3] bg-white px-3 text-[12px] font-medium text-[#172033] outline-none placeholder:text-[#7B8A9C] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>
                </section>

                <section className="rounded-lg border border-[#D8E0EA] bg-white p-5 shadow-sm">
                  <h2 className="mb-3 text-[15px] font-bold text-[#172033]">Product Images</h2>

                  <div className="flex gap-3">
                    <label className="flex h-[95px] flex-1 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#AFC0D3] bg-[#FBFCFE]">
                      <ImageIcon size={22} className="mb-1 text-[#2563EB]" />
                      <p className="text-[10px] font-semibold text-[#34445A]">
                        Drag & drop product images here
                      </p>
                      <p className="mt-1 text-[9px] font-medium text-[#667085]">
                        Upload up to 4 PNG or JPG images
                      </p>
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>

                    {previewUrls.map((url, index) => (
                      <div key={index} className="h-[95px] w-[95px] shrink-0 overflow-hidden rounded-md border-2 border-[#2563EB]">
                        <img src={url} alt={`Product preview ${index + 1}`} className="h-full w-full object-cover" />
                      </div>
                    ))}

                    {previewUrls.length < 4 && (
                      <label className="flex h-[95px] w-[60px] shrink-0 cursor-pointer items-center justify-center rounded-md border border-[#AFC0D3] bg-white">
                        <Plus size={20} className="text-[#34445A]" />
                        <input
                          type="file"
                          accept="image/png,image/jpeg"
                          multiple
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </section>
              </div>

              {/* RIGHT SIDE */}
              <div className="space-y-4">
                <section className="rounded-lg border border-[#D8E0EA] bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-[15px] font-bold text-[#172033]">
                    Inventory & Delivery
                  </h2>

                  <div className="mb-4">
                    <label className="mb-1.5 block text-[11px] font-semibold text-[#24344C]">
                      Available Stock Quantity
                      <span className="text-red-500"> *</span>
                    </label>

                    <input
                      type="number"
                      name="stockQuantity"
                      min="0"
                      value={formData.stockQuantity}
                      onChange={handleChange}
                      placeholder="e.g. 25"
                      className="h-10 w-full rounded-md border border-[#AFC0D3] bg-white px-3 text-[12px] font-medium text-[#172033] outline-none placeholder:text-[#7B8A9C] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]"
                    />
                  </div>

                  <p className="mb-3 text-[11px] font-semibold text-[#24344C]">Fulfillment Mode</p>

                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-[11px] font-medium text-[#34445A]">
                      <input
                        type="checkbox"
                        name="pickup"
                        checked={delivery.pickup}
                        onChange={handleDeliveryChange}
                      />
                      On-campus pickup
                    </label>

                    <label className="flex items-center gap-2 text-[11px] font-medium text-[#34445A]">
                      <input
                        type="checkbox"
                        name="dropoff"
                        checked={delivery.dropoff}
                        onChange={handleDeliveryChange}
                      />
                      Nugegoda Area drop-off
                    </label>

                    <label className="flex items-center gap-2 text-[11px] font-medium text-[#34445A]">
                      <input
                        type="checkbox"
                        name="posting"
                        checked={delivery.posting}
                        onChange={handleDeliveryChange}
                      />
                      Posting
                    </label>
                  </div>
                </section>

                <section className="rounded-lg border border-[#D8E0EA] bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-[15px] font-bold text-[#172033]">Publish Options</h2>

                  {error && (
                    <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-[10px] font-medium text-red-600">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="h-10 w-full rounded-md bg-[#F5A000] text-[11px] font-bold text-[#172033] transition hover:bg-[#E69700] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Submitting..." : "Submit for Review"}
                  </button>

                  <button
                    type="button"
                    className="mt-3 h-10 w-full rounded-md border border-[#AFC0D3] bg-white text-[11px] font-semibold text-[#34445A] hover:bg-[#F8FAFC]"
                  >
                    Save as Draft
                  </button>
                </section>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
