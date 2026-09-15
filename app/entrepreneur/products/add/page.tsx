"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Info, Image as ImageIcon, Plus } from "lucide-react";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

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

export default function AddProductPage() {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    categoryId: "",
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

  // TODO (Sprint 1): this only previews the image locally so far. Actual
  // upload-to-server wiring (see Risk 6 in the architecture doc — saving
  // files under /public/uploads and storing the path via ProductImage)
  // still needs to be added before Add Product is fully done.
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load real categories from the database instead of a hardcoded list,
  // so this stays in sync with whatever Admin/Category Management defines.
  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();
        setCategories(data.categories || []);

        if (data.categories?.length > 0) {
          setFormData((previous) => ({ ...previous, categoryId: data.categories[0].id }));
        }
      } catch (error) {
        console.error("Load categories error:", error);
      }
    }

    loadCategories();
  }, []);

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setFormData((previousData) => ({ ...previousData, [name]: value }));
  }

  function handleDeliveryChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, checked } = event.target;
    setDelivery((previousData) => ({ ...previousData, [name]: checked }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImagePreview(imageUrl);
    }
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

      alert("Product submitted successfully!");
      router.push("/entrepreneur/products");
    } catch (error) {
      console.error("Product submission error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Add New Product" />

        <main className="min-h-0 flex-1 overflow-hidden px-5 py-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-4 flex min-h-[36px] items-center gap-2 rounded-md border border-[#F2B84B] bg-[#FFF8E7] px-3">
              <Info size={14} className="shrink-0 text-[#F2A500]" />
              <p className="text-[10px] font-medium text-[#344054]">
                <span className="font-bold">Notice:</span> All student products must be
                reviewed by the campus administrator before publishing live on the feed.
                Usually approved in under 24 hours!
              </p>
            </div>

            <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(260px,0.8fr)] gap-5">
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
                        Upload PNG or JPG product images
                      </p>
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>

                    {imagePreview && (
                      <div className="h-[95px] w-[95px] overflow-hidden rounded-md border-2 border-[#2563EB]">
                        <img src={imagePreview} alt="Product preview" className="h-full w-full object-cover" />
                      </div>
                    )}

                    <label className="flex h-[95px] w-[60px] cursor-pointer items-center justify-center rounded-md border border-[#AFC0D3] bg-white">
                      <Plus size={20} className="text-[#34445A]" />
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
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
