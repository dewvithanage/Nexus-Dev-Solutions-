import { PageSkeleton } from "@/components/entrepreneur/PageStates";

// Shown straight away while a seller page's data is fetched on the server,
// instead of a blank screen. Next.js wraps each page in this folder in a
// Suspense boundary with this as the fallback.
export default function Loading() {
  return <PageSkeleton />;
}
