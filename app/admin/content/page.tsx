import ReviewsView from "@/components/admin/content/ReviewsView";
import { readSearchParams, requireAdminPage, type PageSearchParams } from "@/lib/admin/page-auth";
import { getReviewsList, reviewsQuerySchema } from "@/lib/admin/content";

// Server Component, rendered on every request (dynamic): guests post new
// reviews at any time and admins remove them here, so the list is always
// read fresh from the database.
export default async function ContentManagementPage({ searchParams }: { searchParams: PageSearchParams }) {
  await requireAdminPage();

  const query = readSearchParams(await searchParams, reviewsQuerySchema);
  const data = await getReviewsList(query);

  return <ReviewsView data={data} />;
}
