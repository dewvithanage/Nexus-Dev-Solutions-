"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryNavigation } from "@/components/admin/useQueryNavigation";
import type { CategoryOption } from "@/lib/admin/products";

// The interactive parts of Admin Product Details. The product itself is
// rendered on the server (app/admin/products/[id]/page.tsx); after a change
// is saved the page is re-rendered from the database.

async function errorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => ({}));
  return body.message || fallback;
}

function ErrorText({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-[11px] text-red-600">
      {message}
    </p>
  );
}

// Approve & Publish / Reject Submission, in the status banner.
export function ProductDecisionButtons({ productId }: { productId: string }) {
  const { isPending, refresh } = useQueryNavigation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function decide(action: "approve" | "reject") {
    let body: string | undefined;
    if (action === "reject") {
      const input = window.prompt("Reason for rejecting this product (optional):");
      // Cancel returns null: stop, instead of rejecting without a reason.
      if (input === null) return;
      body = JSON.stringify({ rejectionReason: input.trim() || undefined });
    }

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productId}/${action}`, {
        method: "PATCH",
        ...(body && { headers: { "Content-Type": "application/json" }, body }),
      });
      if (!response.ok) setError(await errorMessage(response, `Unable to ${action} this product.`));
      refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const busy = loading || isPending;

  return (
    <div>
      <div className="flex gap-2">
        <button
          onClick={() => decide("reject")}
          disabled={busy}
          className="flex-1 whitespace-nowrap rounded-md bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60 sm:flex-none"
        >
          Reject Submission
        </button>
        <button
          onClick={() => decide("approve")}
          disabled={busy}
          className="flex-1 whitespace-nowrap rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-60 sm:flex-none"
        >
          Approve & Publish
        </button>
      </div>
      <ErrorText message={error} />
    </div>
  );
}

// Lets an admin move the product to a different category, mainly to clear
// a category out before deleting it.
export function CategorySelect({
  productId,
  currentCategoryId,
  categories,
}: {
  productId: string;
  currentCategoryId: string;
  categories: CategoryOption[];
}) {
  const { isPending, refresh } = useQueryNavigation();
  const [selected, setSelected] = useState(currentCategoryId);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // After a save (or someone else's change) the server sends the new
  // category; start from that.
  useEffect(() => setSelected(currentCategoryId), [currentCategoryId]);

  async function save() {
    if (selected === currentCategoryId) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selected }),
      });
      if (!response.ok) {
        setError(await errorMessage(response, "Unable to update category."));
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
      refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          aria-label="Product category"
          className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {selected !== currentCategoryId && (
          <button
            onClick={save}
            disabled={saving || isPending}
            className="rounded-md bg-blue-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        )}
        {saved && <span className="text-[10px] text-emerald-600">Saved!</span>}
      </div>
      <ErrorText message={error} />
    </div>
  );
}

// Internal moderator notes. Saving a note never changes the status.
export function AdminNotesForm({ productId, initialNotes }: { productId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/products/${productId}/notes`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNotes: notes }),
      });
      if (!response.ok) {
        setError(await errorMessage(response, "Unable to save notes."));
        return;
      }
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        maxLength={2000}
        aria-label="Admin audit notes"
        placeholder="Enter internal moderator reasons, flag logs, or change suggestions here..."
        className="mt-3 h-24 w-full resize-none rounded-md border border-slate-300 bg-slate-50 p-3 text-xs text-slate-700 outline-none focus:border-blue-500"
      />
      <button
        onClick={save}
        disabled={saving}
        className="mt-3 w-full rounded-md bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {saving ? "Saving..." : saved ? "Saved!" : "Save Internal Notes"}
      </button>
      <ErrorText message={error} />
    </>
  );
}
