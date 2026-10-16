import { revalidatePath } from "next/cache";

// Called by the admin moderation routes after a change is saved, so no
// page keeps showing the old data from the Next.js cache.

// Approving, rejecting or deleting an entrepreneur or product changes what
// the public site shows (marketplace, categories, product and business
// pages, home page) as well as the admin lists and dashboard. Clearing from
// the root layout covers all of them.
export function revalidateAfterModeration() {
  revalidatePath("/", "layout");
}

// Admin-only changes (internal notes): only the admin pages need refreshing.
export function revalidateAdminPages() {
  revalidatePath("/admin", "layout");
}
