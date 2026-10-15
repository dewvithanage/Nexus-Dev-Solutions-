import { redirect } from "next/navigation";
import type { z } from "zod";
import { getCurrentUser } from "@/lib/session";

// For admin Server Component pages. Checks the session on the server, the
// same way the API routes do: middleware can only see that a cookie is
// validly signed, not that it was revoked (logout, password reset).
export async function requireAdminPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/admin/login");
  return user;
}

type SearchParams = Record<string, string | string[] | undefined>;

// The searchParams prop Next.js gives a page.
export type PageSearchParams = Promise<SearchParams>;

// Reads a page's ?query= values with the same Zod schema its API route
// uses. A bad value (e.g. ?page=abc typed into the address bar) falls back
// to the defaults instead of breaking the page.
export function readSearchParams<S extends z.ZodTypeAny>(params: SearchParams, schema: S): z.infer<S> {
  const flat = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  );
  const parsed = schema.safeParse(flat);
  return parsed.success ? parsed.data : schema.parse({});
}
