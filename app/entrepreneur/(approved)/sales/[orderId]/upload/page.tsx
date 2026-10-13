"use client";

import { useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";

export default function UploadSalesConfirmationPage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!file || !deliveryDate) {
      setError("Please attach a delivery photo/receipt and set the date.");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("proofImage", file);
      formData.append("deliveryDate", new Date(deliveryDate).toISOString());
      formData.append("notes", notes);

      const response = await fetch(`/api/orders/${params.orderId}/confirmation`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to submit confirmation.");
        return;
      }

      alert("Fulfillment confirmation submitted for admin review!");
      router.push("/entrepreneur/orders");
    } catch (error) {
      console.error("Submit confirmation error:", error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Sales Fulfillment Desk" />

        <main className="flex-1 overflow-auto px-6 py-5">
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-5">
            <h1 className="text-base font-bold text-slate-900">Fulfillment Confirmation</h1>
            <p className="text-xs text-slate-500">
              Upload proof of campus delivery to verify finished transactions and trigger payouts.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="max-w-2xl rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Upload Proof of Completion</h2>

            <label className="flex h-40 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-blue-300 bg-blue-50/40">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-full w-full rounded-md object-contain p-2" />
              ) : (
                <>
                  <Plus size={22} className="text-blue-500" />
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    Drag & Drop Delivery Photo or Receipt here
                  </p>
                  <p className="mt-1 text-xs text-slate-400">Supports PNG, JPG up to 10MB</p>
                </>
              )}
              <input type="file" accept="image/png,image/jpeg" onChange={handleFileChange} className="hidden" />
            </label>

            <div className="mt-5">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Delivery / Handover Date</label>
              <input
                type="datetime-local"
                value={deliveryDate}
                onChange={(event) => setDeliveryDate(event.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Fulfillment & Quality Notes</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="e.g. Handed package directly to customer at University Library Lobby."
                className="h-20 w-full resize-none rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
              />
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-md border border-slate-300 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-md bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? "Submitting..." : "Submit Confirmation"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
