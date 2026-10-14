"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Sidebar from "@/components/entrepreneur/dashboard/Sidebar";
import DashboardHeader from "@/components/entrepreneur/dashboard/DashboardHeader";
import type { SidebarEntrepreneur } from "@/lib/entrepreneur-data";

export type ProfileData = {
  businessName: string;
  description: string;
  businessCategory: string;
  instagramHandle: string;
  websiteUrl: string;
  businessHours: string;
  pickupLocationNotes: string;
  university: string;
  whatsappNumber: string;
  bio: string;
};

// The Business Profile form. The page (a Server Component) reads the saved
// profile on the server and passes it in, so the form opens already filled.
// Before, a failed load left the form empty, and saving it could have wiped
// the profile; now a failed load shows the error page instead.
export default function BusinessProfileForm({
  initialForm,
  businessId,
  initialLogoUrl,
  sidebar,
}: {
  initialForm: ProfileData;
  businessId: string;
  initialLogoUrl: string | null;
  sidebar: SidebarEntrepreneur;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileData>(initialForm);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  function updateField<K extends keyof ProfileData>(key: K, value: ProfileData[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    setSaveError("");
    setUploadingLogo(true);
    try {
      const response = await fetch("/api/entrepreneurs/me/logo", { method: "POST", body: formData });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setLogoUrl(data.business.logoUrl);
        router.refresh();
      } else {
        setSaveError(data.message || "Unable to upload logo.");
      }
    } catch {
      setSaveError("The logo couldn't be uploaded. Check your connection and try again.");
    } finally {
      setUploadingLogo(false);
      // Lets the same file be chosen again after a failure.
      event.target.value = "";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setSaveError("");

    try {
      const response = await fetch("/api/entrepreneurs/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        // Re-renders the server parts (e.g. the business name in the
        // sidebar) with the saved values.
        router.refresh();
      } else {
        const data = await response.json().catch(() => ({}));
        setSaveError(data.message || "Unable to save your profile.");
      }
    } catch {
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden lg:flex-row bg-[#F5F7FA]">
      <Sidebar entrepreneur={sidebar} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardHeader title="Business Profile Management" />

        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-slate-900">Public Profile Settings</h1>
                <p className="text-xs text-slate-500">
                  Optimize how your university business looks on the public marketplace feed.
                </p>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/business/${businessId}`}
                  target="_blank"
                  className="rounded-md border border-blue-600 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  Preview Profile
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>

            {saveError && (
              <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-600">{saveError}</p>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.7fr_1fr]">
              <div className="space-y-5">
                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h2 className="mb-4 text-sm font-bold text-slate-900">Business Information</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">Business Name</label>
                      <input
                        value={form.businessName}
                        onChange={(e) => updateField("businessName", e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">Business Category</label>
                      <input
                        value={form.businessCategory}
                        onChange={(e) => updateField("businessCategory", e.target.value)}
                        placeholder="e.g. Tech Accessory"
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">Business Description</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => updateField("description", e.target.value)}
                        className="h-24 w-full resize-none rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">Faculty</label>
                      <input
                        value={form.university}
                        onChange={(e) => updateField("university", e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h2 className="mb-4 text-sm font-bold text-slate-900">Contact & Logistics</h2>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                        WhatsApp Confirm Phone
                      </label>
                      <input
                        value={form.whatsappNumber}
                        onChange={(e) => updateField("whatsappNumber", e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">Short Bio / Tagline</label>
                      <input
                        value={form.bio}
                        onChange={(e) => updateField("bio", e.target.value)}
                        placeholder="Crafting premium wool cardigans..."
                        className="w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                      On-Campus Pickup Location Notes
                    </label>
                    <textarea
                      value={form.pickupLocationNotes}
                      onChange={(e) => updateField("pickupLocationNotes", e.target.value)}
                      className="h-16 w-full resize-none rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600"
                    />
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section className="rounded-lg border border-slate-200 bg-white p-5 text-center">
                  <h2 className="mb-4 text-left text-sm font-bold text-slate-900">Profile Photo / Logo</h2>
                  <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-slate-100">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-slate-400">?</span>
                    )}
                  </div>
                  <label
                    className={`mt-3 inline-block rounded-md border border-slate-300 px-4 py-1.5 text-xs font-semibold text-slate-700 ${
                      uploadingLogo ? "cursor-wait opacity-60" : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    {uploadingLogo ? "Uploading..." : "Replace Logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoChange}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5">
                  <h2 className="mb-4 text-sm font-bold text-slate-900">Social Links & Hours</h2>

                  <div className="space-y-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">Instagram Handle</label>
                      <input
                        value={form.instagramHandle}
                        onChange={(e) => updateField("instagramHandle", e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">Website</label>
                      <input
                        value={form.websiteUrl}
                        onChange={(e) => updateField("websiteUrl", e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-700">Weekly Business Hours</label>
                      <input
                        value={form.businessHours}
                        onChange={(e) => updateField("businessHours", e.target.value)}
                        placeholder="Mon-Fri, 9:00 AM - 5:00 PM"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-600"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
